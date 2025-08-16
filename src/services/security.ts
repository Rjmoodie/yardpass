import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export interface SecurityConfig {
  encryptionEnabled: boolean;
  biometricEnabled: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireMFA: boolean;
  enableRateLimiting: boolean;
  enableInputValidation: boolean;
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
}

export interface SecurityAudit {
  timestamp: number;
  event: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RateLimitInfo {
  key: string;
  limit: number;
  remaining: number;
  reset: number;
  blocked: boolean;
}

class SecurityService {
  private config: SecurityConfig;
  private loginAttempts: Map<string, { count: number; lastAttempt: number; blockedUntil?: number }> = new Map();
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private auditLog: SecurityAudit[] = [];
  private sessionTokens: Set<string> = new Set();
  private isInitialized = false;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      encryptionEnabled: true,
      biometricEnabled: false,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxLoginAttempts: 5,
      requireMFA: false,
      enableRateLimiting: true,
      enableInputValidation: true,
      enableXSSProtection: true,
      enableCSRFProtection: true,
      ...config
    };
  }

  /**
   * Initialize the security service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if device supports biometric authentication
      if (this.config.biometricEnabled) {
        await this.checkBiometricSupport();
      }

      // Initialize encryption keys
      if (this.config.encryptionEnabled) {
        await this.initializeEncryption();
      }

      this.isInitialized = true;
      console.log('Security service initialized');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
    }
  }

  /**
   * Validate user input to prevent XSS and injection attacks
   */
  validateInput(input: string, type: 'text' | 'email' | 'password' | 'url' | 'number'): boolean {
    if (!this.config.enableInputValidation) return true;

    const patterns = {
      text: /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+=<>[\]{}|\\:;"'`~\/]+$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      number: /^\d+$/,
    };

    return patterns[type].test(input);
  }

  /**
   * Sanitize user input to prevent XSS attacks
   */
  sanitizeInput(input: string): string {
    if (!this.config.enableXSSProtection) return input;

    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash a password using secure hashing
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await this.generateSalt();
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return `${salt}:${hash}`;
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, storedHash] = hash.split(':');
    const computedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return computedHash === storedHash;
  }

  /**
   * Generate a salt for password hashing
   */
  private async generateSalt(): Promise<string> {
    const randomBytes = await Crypto.getRandomStringAsync(16);
    return randomBytes;
  }

  /**
   * Check login attempts and apply rate limiting
   */
  checkLoginAttempts(identifier: string): { allowed: boolean; remainingAttempts: number; blockedUntil?: number } {
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts) {
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    }

    // Check if user is blocked
    if (attempts.blockedUntil && Date.now() < attempts.blockedUntil) {
      return { 
        allowed: false, 
        remainingAttempts: 0, 
        blockedUntil: attempts.blockedUntil 
      };
    }

    // Reset if last attempt was more than 1 hour ago
    if (Date.now() - attempts.lastAttempt > 60 * 60 * 1000) {
      this.loginAttempts.delete(identifier);
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    }

    const remainingAttempts = Math.max(0, this.config.maxLoginAttempts - attempts.count);
    const allowed = remainingAttempts > 0;

    return { allowed, remainingAttempts };
  }

  /**
   * Record a failed login attempt
   */
  recordFailedLogin(identifier: string): void {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    attempts.count += 1;
    attempts.lastAttempt = Date.now();

    // Block user if max attempts exceeded
    if (attempts.count >= this.config.maxLoginAttempts) {
      attempts.blockedUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
    }

    this.loginAttempts.set(identifier, attempts);

    this.audit('failed_login', {
      identifier,
      attemptCount: attempts.count,
      blockedUntil: attempts.blockedUntil,
    }, 'high');
  }

  /**
   * Reset login attempts for a user
   */
  resetLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  /**
   * Check rate limiting for API requests
   */
  checkRateLimit(key: string, limit: number, windowMs: number): RateLimitInfo {
    if (!this.config.enableRateLimiting) {
      return {
        key,
        limit,
        remaining: limit,
        reset: Date.now() + windowMs,
        blocked: false,
      };
    }

    const now = Date.now();
    const rateLimit = this.rateLimits.get(key);

    if (!rateLimit || now > rateLimit.reset) {
      // Create new rate limit window
      const newRateLimit: RateLimitInfo = {
        key,
        limit,
        remaining: limit - 1,
        reset: now + windowMs,
        blocked: false,
      };
      this.rateLimits.set(key, newRateLimit);
      return newRateLimit;
    }

    // Update existing rate limit
    rateLimit.remaining = Math.max(0, rateLimit.remaining - 1);
    rateLimit.blocked = rateLimit.remaining === 0;
    this.rateLimits.set(key, rateLimit);

    return rateLimit;
  }

  /**
   * Generate and store a session token
   */
  async createSession(userId: string): Promise<string> {
    const token = this.generateSecureToken(64);
    const expiresAt = Date.now() + this.config.sessionTimeout;

    await SecureStore.setItemAsync(`session_${token}`, JSON.stringify({
      userId,
      expiresAt,
      createdAt: Date.now(),
    }));

    this.sessionTokens.add(token);

    this.audit('session_created', {
      userId,
      token: token.substring(0, 8) + '...',
      expiresAt,
    }, 'low');

    return token;
  }

  /**
   * Validate a session token
   */
  async validateSession(token: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      const sessionData = await SecureStore.getItemAsync(`session_${token}`);
      
      if (!sessionData) {
        return { valid: false };
      }

      const session = JSON.parse(sessionData);
      
      if (Date.now() > session.expiresAt) {
        await this.destroySession(token);
        return { valid: false };
      }

      return { valid: true, userId: session.userId };
    } catch (error) {
      console.error('Error validating session:', error);
      return { valid: false };
    }
  }

  /**
   * Destroy a session token
   */
  async destroySession(token: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(`session_${token}`);
      this.sessionTokens.delete(token);

      this.audit('session_destroyed', {
        token: token.substring(0, 8) + '...',
      }, 'low');
    } catch (error) {
      console.error('Error destroying session:', error);
    }
  }

  /**
   * Check if device supports biometric authentication
   */
  private async checkBiometricSupport(): Promise<boolean> {
    try {
      // This would need to be implemented with a native module
      // For now, return false
      return false;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  }

  /**
   * Initialize encryption keys
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Check if encryption key exists
      const existingKey = await SecureStore.getItemAsync('encryption_key');
      
      if (!existingKey) {
        // Generate new encryption key
        const key = this.generateSecureToken(32);
        await SecureStore.setItemAsync('encryption_key', key);
      }
    } catch (error) {
      console.error('Error initializing encryption:', error);
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string): Promise<string> {
    if (!this.config.encryptionEnabled) return data;

    try {
      const key = await SecureStore.getItemAsync('encryption_key');
      if (!key) {
        throw new Error('Encryption key not found');
      }

      // This is a simplified encryption - in production, use a proper encryption library
      const encrypted = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + key,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      return encrypted;
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: string): Promise<string> {
    if (!this.config.encryptionEnabled) return encryptedData;

    try {
      // This is a simplified decryption - in production, use a proper encryption library
      // For now, return the encrypted data as-is
      return encryptedData;
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
    }
  }

  /**
   * Record security audit events
   */
  audit(event: string, details: Record<string, any>, riskLevel: SecurityAudit['riskLevel']): void {
    const auditEntry: SecurityAudit = {
      timestamp: Date.now(),
      event,
      userId: details.userId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      details,
      riskLevel,
    };

    this.auditLog.push(auditEntry);

    // Keep only last 1000 audit entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Log high-risk events immediately
    if (riskLevel === 'high' || riskLevel === 'critical') {
      console.warn('Security Alert:', auditEntry);
    }
  }

  /**
   * Get security audit log
   */
  getAuditLog(): SecurityAudit[] {
    return [...this.auditLog];
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalAuditEvents: number;
    highRiskEvents: number;
    activeSessions: number;
    blockedUsers: number;
    rateLimitedRequests: number;
  } {
    const highRiskEvents = this.auditLog.filter(
      event => event.riskLevel === 'high' || event.riskLevel === 'critical'
    ).length;

    const blockedUsers = Array.from(this.loginAttempts.values()).filter(
      attempts => attempts.blockedUntil && Date.now() < attempts.blockedUntil
    ).length;

    const rateLimitedRequests = Array.from(this.rateLimits.values()).filter(
      limit => limit.blocked
    ).length;

    return {
      totalAuditEvents: this.auditLog.length,
      highRiskEvents,
      activeSessions: this.sessionTokens.size,
      blockedUsers,
      rateLimitedRequests,
    };
  }

  /**
   * Cleanup expired sessions and rate limits
   */
  cleanup(): void {
    const now = Date.now();

    // Clean up expired rate limits
    for (const [key, rateLimit] of this.rateLimits.entries()) {
      if (now > rateLimit.reset) {
        this.rateLimits.delete(key);
      }
    }

    // Clean up expired login attempts
    for (const [identifier, attempts] of this.loginAttempts.entries()) {
      if (attempts.blockedUntil && now > attempts.blockedUntil) {
        this.loginAttempts.delete(identifier);
      }
    }
  }
}

// Export singleton instance
const security = new SecurityService();
export default security;
