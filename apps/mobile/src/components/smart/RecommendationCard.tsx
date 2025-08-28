import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recommendation } from '@/services/smartServices';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onPress: (recommendation: Recommendation) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ 
  recommendation, 
  onPress 
}) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress(recommendation)}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{recommendation.title}</Text>
          <View style={styles.confidenceContainer}>
            <Ionicons name="trending-up" size={16} color="#00ff88" />
            <Text style={styles.confidence}>{Math.round(recommendation.confidence * 100)}%</Text>
          </View>
        </View>
        <Text style={styles.description}>{recommendation.description}</Text>
        <Text style={styles.reason}>{recommendation.reason}</Text>
        <View style={styles.typeContainer}>
          <Ionicons 
            name={
              recommendation.type === 'event' ? 'calendar' :
              recommendation.type === 'user' ? 'person' : 'document'
            } 
            size={16} 
            color="#666" 
          />
          <Text style={styles.type}>{recommendation.type}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidence: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  reason: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  type: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
});

export default RecommendationCard;
