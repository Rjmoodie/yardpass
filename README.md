# YardPass

A comprehensive event management and social platform built with React Native, Expo, and Supabase.

## 🚀 Features

- **Event Management**: Create, discover, and manage events
- **Social Feed**: Video and image sharing with engagement features
- **Ticket System**: Purchase and manage event tickets with QR codes
- **Real-time Updates**: Live notifications and updates
- **Video Streaming**: Integrated video upload and playback with Mux
- **Authentication**: Secure user authentication and authorization
- **Cross-platform**: Works on iOS, Android, and Web

## 🛠 Tech Stack

- **Frontend**: React Native with Expo SDK 49
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Video Processing**: Mux for video upload and streaming
- **State Management**: Redux Toolkit with RTK Query
- **Navigation**: React Navigation 6
- **UI Components**: Custom components with React Native
- **TypeScript**: Full type safety across the application

## 📱 Screenshots

[Add screenshots here]

## 🏗 Project Structure

```
YardPass/
├── apps/
│   └── mobile/                 # React Native mobile app
│       ├── src/
│       │   ├── components/     # Reusable UI components
│       │   ├── screens/        # Screen components
│       │   ├── navigation/     # Navigation configuration
│       │   ├── store/          # Redux store and slices
│       │   ├── services/       # API services and utilities
│       │   ├── types/          # TypeScript type definitions
│       │   └── constants/      # App constants and theme
│       └── package.json
├── packages/
│   ├── api/                    # Backend API services
│   ├── types/                  # Shared TypeScript types
│   └── ui/                     # Shared UI components
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/yardpass.git
   cd yardpass
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   MUX_TOKEN_ID=your_mux_token_id
   MUX_TOKEN_SECRET=your_mux_token_secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Run on your preferred platform**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Set up the database schema (see `supabase/migrations/`)
3. Configure authentication providers
4. Set up storage buckets for media uploads
5. Configure real-time subscriptions

### Mux Setup

1. Create a Mux account
2. Generate API tokens
3. Configure webhook endpoints
4. Set up video processing pipelines

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📦 Deployment

### Mobile App Store Deployment

1. **Build for production**
   ```bash
   npm run build:ios
   npm run build:android
   ```

2. **Submit to app stores**
   - iOS: Use App Store Connect
   - Android: Use Google Play Console

### Web Deployment

1. **Build for web**
   ```bash
   npm run build:web
   ```

2. **Deploy to your preferred platform**
   - Vercel: `vercel --prod`
   - Netlify: `netlify deploy --prod`
   - AWS S3: Upload build files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/yardpass/issues) page
2. Create a new issue with detailed information
3. Join our [Discord](https://discord.gg/yardpass) community

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) for the amazing development platform
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Mux](https://mux.com/) for video processing capabilities
- [React Native](https://reactnative.dev/) community for the excellent framework

---

Made with ❤️ by the YardPass team
