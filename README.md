# YardPass - Event Management Platform

## 📁 Project Structure

```
yardpass/
├── 📁 apps/                    # Application directories
│   └── 📁 mobile/             # React Native mobile app
├── 📁 src/                     # Source code
│   ├── 📁 components/         # Reusable UI components
│   ├── 📁 constants/          # App constants and configuration
│   ├── 📁 hooks/              # Custom React hooks
│   ├── 📁 navigation/         # Navigation configuration
│   ├── 📁 screens/            # Screen components
│   ├── 📁 services/           # API services and utilities
│   ├── 📁 store/              # Redux store and slices
│   ├── 📁 types/              # TypeScript type definitions
│   └── 📁 utils/              # Utility functions
├── 📁 supabase/               # Supabase configuration
│   ├── 📁 functions/          # Edge functions
│   └── schema.sql             # Database schema
├── 📁 docs/                   # Documentation and guides
│   ├── 📁 edits/              # Edit files and notes
│   ├── 📁 guides/             # Implementation guides
│   ├── 📁 sql/                # SQL scripts and fixes
│   └── 📁 tests/              # Test files and scripts
├── 📁 scripts/                # Build and deployment scripts
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- React Native CLI
- Supabase CLI
- Expo CLI

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 📚 Documentation

### Guides (`docs/guides/`)
- Implementation guides and tutorials
- Migration guides
- Security configuration
- Performance optimization

### SQL Scripts (`docs/sql/`)
- Database fixes and updates
- Schema modifications
- Security patches
- Performance optimizations

### Edit Files (`docs/edits/`)
- Development notes
- Bug fixes documentation
- Feature implementation notes

### Test Files (`docs/tests/`)
- Test scripts and utilities
- Performance testing
- Debugging tools

## 🔧 Development

### Database Changes
All database changes should be made through SQL scripts in `docs/sql/` and applied via Supabase Dashboard.

### Edge Functions
Edge functions are located in `supabase/functions/` and can be deployed using:
```bash
supabase functions deploy <function-name>
```

### Code Organization
- **Components**: Reusable UI components in `src/components/`
- **Screens**: Main app screens in `src/screens/`
- **Services**: API and business logic in `src/services/`
- **Types**: TypeScript definitions in `src/types/`

## 🛠️ Available Scripts

```bash
# Development
npm start          # Start Expo development server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run on web browser

# Testing
npm test           # Run tests
npm run test:watch # Run tests in watch mode

# Building
npm run build      # Build for production
npm run eject      # Eject from Expo managed workflow

# Linting
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint errors
```

## 📱 Features

- **Event Management**: Create, edit, and manage events
- **User Authentication**: Secure login and registration
- **Real-time Updates**: Live event updates and notifications
- **Search & Discovery**: Advanced search with relevance scoring
- **Social Features**: Posts, comments, and reactions
- **Location Services**: Map integration and location-based search
- **Payment Processing**: Ticket sales and payment handling

## 🔒 Security

- Row Level Security (RLS) policies
- Secure authentication with Supabase Auth
- Input validation and sanitization
- Secure file uploads with size limits
- API rate limiting and protection

## 📊 Performance

- Optimized database queries with indexes
- Full-text search with relevance scoring
- Image optimization and caching
- Lazy loading and code splitting
- Performance monitoring and analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation in `docs/`
- Review the guides in `docs/guides/`
- Check SQL fixes in `docs/sql/`
- Review implementation notes in `docs/edits/`

