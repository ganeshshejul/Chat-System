# 💬 Real-Time Chat Application

A modern, feature-rich real-time chat application built with React and Firebase. Connect with friends through public group chats or private one-on-one conversations with file sharing capabilities.

![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)
![Firebase](https://img.shields.io/badge/Firebase-11.7.1-orange?logo=firebase)
![Vite](https://img.shields.io/badge/Vite-6.3.5-purple?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🔐 Authentication & User Management
- **Email/Password Authentication** - Secure user registration and login
- **Google OAuth Integration** - Quick sign-in with Google accounts
- **Email Verification** - Verify user accounts for enhanced security
- **User Profiles** - Customizable display names and usernames
- **Profile Management** - Edit profile information and change passwords

### 💬 Messaging
- **Real-time Public Chat** - Join the global conversation with all users
- **Private Messaging** - One-on-one conversations with other users
- **Message History** - Persistent message storage and retrieval
- **Auto-scroll** - Smart scrolling with manual scroll-to-bottom option
- **Multi-line Support** - Send messages with line breaks (Shift+Enter)

### 👥 Contact Management
- **User Search** - Find and connect with other users by username or display name
- **Contact List** - Manage your personal contact list
- **Unread Message Indicators** - Visual indicators for new messages
- **Chat History Management** - Clear chat history when needed

### 🎨 User Experience
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Modern UI** - Clean, intuitive interface with React Icons
- **Real-time Updates** - Instant message delivery and updates
- **Error Handling** - User-friendly error messages and validation
- **Loading States** - Visual feedback during operations

## 🛠️ Tech Stack

- **Frontend**: React 19.1.0 with Vite
- **Backend**: Firebase (Firestore Database, Authentication, Storage)
- **Routing**: React Router DOM 7.6.0
- **Icons**: React Icons 5.5.0
- **Styling**: CSS3 with modern features
- **Build Tool**: Vite 6.3.5

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** - Package manager
- **Firebase Account** - [Create account](https://firebase.google.com/)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/ganeshshejul/Chat-System.git
cd Chat-System
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Firebase Setup

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Add a web app to your project
4. Copy the Firebase configuration object

#### Enable Required Services
1. **Authentication**:
   - Go to "Authentication" → "Sign-in method"
   - Enable "Email/Password" provider
   - (Optional) Enable "Google" provider for OAuth

2. **Firestore Database**:
   - Go to "Firestore Database"
   - Click "Create database"
   - Start in test mode (for development)
   - Choose your preferred location

3. **Storage** (for file uploads):
   - Go to "Storage"
   - Click "Get started"
   - Start in test mode
   - Choose your preferred location

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> ⚠️ **Important**: Replace the placeholder values with your actual Firebase configuration. Never commit your `.env` file to version control.

### 5. Start Development Server
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
Chat-System/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ChatInput.jsx    # Message input component
│   │   ├── ChatMessage.jsx  # Message display component
│   │   ├── ContactsList.jsx # Contact management
│   │   ├── FileUpload.jsx   # File sharing functionality
│   │   ├── PrivateChat.jsx  # Private messaging
│   │   └── ...
│   ├── context/             # React Context providers
│   │   ├── AuthContext.jsx  # Authentication state
│   │   └── UserContext.jsx  # User and messaging state
│   ├── pages/               # Main application pages
│   │   ├── Chat.jsx         # Main chat interface
│   │   ├── Login.jsx        # Login page
│   │   └── Signup.jsx       # Registration page
│   ├── firebase/            # Firebase configuration
│   ├── utils/               # Utility functions
│   └── styles/              # CSS stylesheets
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
└── vite.config.js          # Vite configuration
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build the application for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint to check code quality |

## 🚀 Deployment

### Deploy to Netlify

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables in Netlify dashboard

### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

### Deploy to Firebase Hosting

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase Hosting**:
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to `dist`
   - Configure as single-page app: `Yes`
   - Don't overwrite `index.html`

4. **Build and Deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## 🔒 Security Configuration

### Firestore Security Rules

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Allow reading other users for search
    }

    // Public messages - authenticated users can read/write
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }

    // Private messages - only participants can access
    match /privateMessages/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in chatId.split('_');
    }
  }
}
```

### Storage Security Rules

For Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat_files/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🎯 Usage Guide

### Getting Started
1. **Sign Up**: Create a new account with email and password
2. **Verify Email**: Check your email for verification link
3. **Set Profile**: Choose a display name and username
4. **Start Chatting**: Join the public chat or search for users to message privately

### Public Chat
- All authenticated users can participate
- Messages are visible to everyone
- Real-time updates for new messages
- File sharing supported

### Private Messaging
1. **Find Users**: Use the search feature to find other users
2. **Add Contacts**: Add users to your contact list
3. **Start Chatting**: Click on a contact to start private messaging
4. **Manage Chats**: Clear chat history or remove contacts as needed

### File Sharing
1. **Upload Files**: Click the attachment icon in the message input
2. **Select File**: Choose from images, documents, videos, or audio
3. **Monitor Progress**: Watch the upload progress indicator
4. **Send Message**: File will be shared once upload completes

## 🐛 Troubleshooting

### Common Issues

**Firebase Configuration Error**
- Ensure all environment variables are correctly set
- Verify Firebase project settings
- Check that required services are enabled

**Authentication Issues**
- Verify email/password provider is enabled
- Check email verification status
- Ensure proper error handling

**File Upload Problems**
- Check Firebase Storage is enabled
- Verify storage security rules
- Ensure file size limits are appropriate

**Real-time Updates Not Working**
- Check Firestore security rules
- Verify internet connection
- Check browser console for errors

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Firebase configuration
3. Ensure all required Firebase services are enabled
4. Check the troubleshooting section above

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI library
- [Firebase](https://firebase.google.com/) - Backend services
- [Vite](https://vitejs.dev/) - Build tool
- [React Icons](https://react-icons.github.io/react-icons/) - Icon library

## 📞 Support

If you have any questions or need help with the project, please feel free to:
- Open an issue on GitHub
- Contact: contact.ganeshshejul@gmail.com

---

**Made By ❤️ Ganesh Shejul**
