# Omerald - Health Management Platform

A comprehensive health management platform that allows users to store, manage, and share health records with ease. Omerald helps you keep track of your family members' health and provides valuable health insights through AI-powered analysis.

## About

**Omerald** (Organising Medical Record with Analytical Diagnostics) is a Next.js-based health management platform that analyzes past health records and provides valuable analytics. These analyses can be used by doctors for future references and better healthcare decisions.

### Mission
To create a better health ecosystem by organizing medical records with analytical diagnostics.

## Features

### Core Features
- **Health Records Management**: Upload, store, and organize health reports securely
- **Family Members Management**: Add and manage health records for multiple family members (up to 300 members on Enterprise plan)
- **Report Analysis**: AI-powered analysis of health reports to identify diagnosed conditions and abnormalities
- **Analytics Dashboard**: Visual analytics with charts and insights for health trends
- **Report Sharing**: Share reports with doctors and healthcare providers securely
- **Member Sharing**: Share family members with trusted contacts for collaborative health management
- **Vaccine Tracking**: Track vaccine schedules and completion status
- **Certificate Storage**: Store and manage health certificates digitally
- **Body Impact Visualization**: Visual representation of health impacts on body parts
- **Diagnostic Center Integration**: Connect with diagnostic centers and pathologists
- **Health Articles**: Access curated health articles and topics
- **Subscription Management**: Multiple subscription tiers (Free, Premium, Enterprise)
- **PWA Support**: Progressive Web App for mobile and desktop access

### Additional Features
- **Clerk Authentication**: Secure authentication with phone number verification
- **Payment Integration**: Razorpay integration for subscription payments
- **Email Notifications**: Mailchimp integration for newsletters and communications
- **AI-Powered Analysis**: OpenAI integration for intelligent report analysis
- **Cloud Storage**: AWS S3 for secure file storage
- **Multi-Database Support**: MongoDB for user data, MySQL for additional data storage
- **Responsive Design**: Fully responsive design for all devices

## Tech Stack

### Frontend
- **Framework**: Next.js 14.2.5 (React 18.3.1)
- **Styling**: Tailwind CSS 4
- **State Management**: Recoil
- **Data Fetching**: TanStack React Query
- **Authentication**: Clerk
- **Charts**: Chart.js with react-chartjs-2
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Lucide React, Heroicons

### Backend
- **Runtime**: Node.js
- **Database**: MongoDB (Mongoose), MySQL (mysql2)
- **Storage**: AWS S3
- **Authentication**: Clerk, JWT
- **Email**: Nodemailer (SMTP), Mailchimp
- **Payments**: Razorpay
- **AI**: OpenAI API

## Backend APIs

### User APIs
- `POST /api/user/register` - User registration
- `GET /api/user/getAllUsers` - Get all users
- `GET /api/user/getUserById` - Get user by ID
- `PUT /api/user/updateUser` - Update user
- `DELETE /api/user/deleteUser` - Delete user
- `POST /api/user/deleteManyUsers` - Delete multiple users

### Profile APIs
- `POST /api/profile/createProfile` - Create user profile
- `GET /api/profile/getProfileByPhone` - Get profile by phone number
- `GET /api/profile/getProfileById` - Get profile by ID
- `GET /api/profile/getAllProfiles` - Get all profiles
- `PUT /api/profile/updateProfile` - Update profile
- `DELETE /api/profile/deleteProfile` - Delete profile
- `POST /api/profile/insertProfile` - Insert new profile

### Member Management APIs
- `POST /api/profile/addMember` - Add family member
- `GET /api/profile/getMembersById` - Get members by ID
- `POST /api/profile/shareMember` - Share member with contacts
- `POST /api/profile/acceptSharedMember` - Accept shared member
- `POST /api/profile/rejectSharedMember` - Reject shared member
- `POST /api/profile/unshareMember` - Unshare member
- `GET /api/profile/getPendingShares` - Get pending shares
- `GET /api/members/getSharedMembers` - Get shared members
- `GET /api/members/getSharedMemByContact` - Get shared member by contact
- `GET /api/members/getSharedMemById` - Get shared member by ID
- `POST /api/members/insertSharedMem` - Insert shared member
- `PUT /api/members/updateSharedMem` - Update shared member

### Report APIs
- `POST /api/reports/insertReport` - Upload new report
- `GET /api/reports/getReports` - Get all reports
- `GET /api/reports/getManyReports` - Get multiple reports
- `GET /api/reports/getManyReportById` - Get report by ID
- `GET /api/reports/getReportsByMembers` - Get reports by member
- `PUT /api/reports/updateReport` - Update report
- `DELETE /api/reports/deleteReport` - Delete report
- `GET /api/reports/getPendingSharedReports` - Get pending shared reports

### Report Analysis APIs
- `POST /api/profile/analyzeDiagnosedConditions` - Analyze diagnosed conditions from reports
- `POST /api/profile/analyzeBodyImpact` - Analyze body impact visualization
- `POST /api/body/analyzeCoordinates` - Analyze body coordinates

### Diagnostic Center APIs
- `GET /api/reports/getReportsFromDC` - Get reports from diagnostic center
- `GET /api/reports/getSharedReportsFromDC` - Get shared reports from DC
- `POST /api/reports/acceptSharedReportFromDC` - Accept shared report from DC
- `POST /api/reports/rejectSharedReportFromDC` - Reject shared report from DC
- `GET /api/diagnosticCenter/getDCDetails` - Get diagnostic center details
- `GET /api/diagnosticCenter/getDCName` - Get DC name
- `GET /api/diagnosticCenter/getBranchDetails` - Get branch details
- `GET /api/diagnosticCenter/getBranchName` - Get branch name
- `GET /api/diagnosticCenter/getPathologistDetails` - Get pathologist details

### Vaccine APIs
- `POST /api/vaccine/create` - Create vaccine entry
- `GET /api/vaccine/getVaccines` - Get all vaccines
- `GET /api/vaccine/getVaccine` - Get vaccine by ID
- `PUT /api/vaccine/update` - Update vaccine
- `DELETE /api/vaccine/delete` - Delete vaccine
- `POST /api/profile/markVaccineCompleted` - Mark vaccine as completed
- `PUT /api/profile/updateVaccineCompletion` - Update vaccine completion
- `DELETE /api/profile/deleteVaccineCompletion` - Delete vaccine completion

### Dose & Duration APIs
- `POST /api/dose/create` - Create dose entry
- `GET /api/dose/getDoses` - Get all doses
- `GET /api/dose/getDose` - Get dose by ID
- `PUT /api/dose/update` - Update dose
- `DELETE /api/dose/delete` - Delete dose
- `POST /api/doseDuration/create` - Create dose duration
- `GET /api/doseDuration/getDoseDurations` - Get all dose durations
- `GET /api/doseDuration/getDoseDuration` - Get dose duration by ID
- `PUT /api/doseDuration/update` - Update dose duration
- `DELETE /api/doseDuration/delete` - Delete dose duration

### Report Type APIs
- `POST /api/reportType/create` - Create report type
- `GET /api/reportType/getReportTypes` - Get all report types
- `GET /api/reportType/getReportType` - Get report type by ID
- `PUT /api/reportType/update` - Update report type
- `DELETE /api/reportType/delete` - Delete report type

### Upload APIs
- `POST /api/upload/report` - Upload report file
- `POST /api/upload/certificate` - Upload certificate
- `POST /api/upload/profileImage` - Upload profile image
- `GET /api/upload/getSignedUrl` - Get signed URL for S3 access

### Subscription APIs
- `POST /api/razorpay/createSubscriptionOrder` - Create subscription order
- `POST /api/razorpay/paySubscriptionOrder` - Process payment
- `GET /api/razorpay/listSubscriptionOrders` - List subscription orders

### Article & Health Topic APIs
- `GET /api/articles/getArticles` - Get health articles
- `GET /api/healthTopics/getHealthTopics` - Get health topics
- `POST /api/healthTopic/create` - Create health topic
- `GET /api/healthTopic/getHealthTopics` - Get all health topics
- `GET /api/healthTopic/getHealthTopic` - Get health topic by ID
- `PUT /api/healthTopic/update` - Update health topic
- `DELETE /api/healthTopic/delete` - Delete health topic

### Keyword & Query APIs
- `POST /api/keyword/create` - Create keyword
- `GET /api/keyword/getKeywords` - Get all keywords
- `GET /api/keyword/getKeyword` - Get keyword by ID
- `PUT /api/keyword/update` - Update keyword
- `DELETE /api/keyword/delete` - Delete keyword
- `POST /api/queries/insertQueries` - Insert query
- `GET /api/queries/getQueries` - Get queries
- `PUT /api/queries/updateQueries` - Update query
- `DELETE /api/queries/deleteQueries` - Delete query

### Doctor APIs
- `POST /api/profile/requestDoctorStatus` - Request doctor status
- `GET /api/profile/getDoctorRequests` - Get doctor requests
- `POST /api/profile/approveDoctor` - Approve doctor status

### Admin APIs
- `POST /api/admin/vaccines` - Admin vaccine management
- `POST /api/admin/doses` - Admin dose management
- `POST /api/admin/durations` - Admin duration management

### Utility APIs
- `POST /api/sendMail` - Send email via SMTP
- `POST /api/subscribeUserToNewsletter` - Subscribe to newsletter (Mailchimp)

## Environment Configuration

Create a `.env.local` file in the root directory with the following environment variables:

### Database Configuration
```env
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?appName=app-name
MONGO_DB_ENV=omerald-dev

# MySQL Configuration
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_DATABASE=your-database-name
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
```

### Authentication (Clerk)
```env
# Clerk Frontend API Key (Public)
NEXT_PUBLIC_CLERK_FRONTEND_API=pk_test_...

# Clerk Secret Key (Server-side only)
CLERK_SECRET_KEY=sk_test_...

# JWT Secret (for custom JWT)
JWT_SECRET=your-jwt-secret-key
```

### AWS S3 Configuration
```env
# AWS Credentials
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
# OR use AWS_SECRET_REGION if different
AWS_SECRET_REGION=us-east-1

# S3 Bucket Name (supports both variable names)
AWS_S3_BUCKET_NAME=your-bucket-name
# OR
AWS_BUCKET_NAME=your-bucket-name
```

### OpenAI Configuration
```env
# OpenAI API Key for AI-powered analysis
OPENAI_API_KEY=sk-proj-...
```

### Payment Gateway (Razorpay)
```env
# Razorpay Keys
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_SECRET_ID=your-razorpay-secret-id

# Razorpay Public Key (for frontend)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-public-key-id
```

### Email Configuration
```env
# SMTP Configuration (for Nodemailer)
SMTP_HOST=smtp.zoho.in
SMTP_PORT=465
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password

# Mailchimp Configuration (for Newsletter)
MAILCHIMP_API_KEY=your-mailchimp-api-key
MAILCHIMP_API_SERVER=us1
MAILCHIMP_AUDIENCE_ID=your-audience-id
```

### External Service URLs
```env
# Blog API URL
NEXT_PUBLIC_BLOG_API_URL=http://omerald-blog.vercel.app

# Diagnostic Center API Base URL (optional, used in some API calls)
DC_API_BASE_URL=https://omerald-dc.vercel.app
NEXT_PUBLIC_DC_API_BASE_URL=https://omerald-dc.vercel.app

# Admin Service URL (optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Firebase Configuration (Optional)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Development Configuration
```env
# Node Environment
NODE_ENV=development

# Enable coordinate analysis (optional)
NEXT_PUBLIC_ENABLE_COORD_ANALYSIS=true
```

## Frontend Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**: Latest version
- **Git**: For version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/omeraldHealth/omerald.git
   cd omerald
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install

   # Or using yarn
   yarn install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env.local` (if available) or create `.env.local`
   - Add all required environment variables as mentioned in the Environment Configuration section

4. **Run the development server**
   ```bash
   # Using npm
   npm run dev

   # Or using yarn
   yarn dev
   ```

5. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - The application should now be running

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Or using yarn
yarn build
yarn start
```

## Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
```

This will start the Next.js development server with:
- Hot module replacement (HMR)
- React Query DevTools (in development)
- Error overlays
- Fast refresh

### Production Mode

```bash
# Build first
npm run build

# Then start
npm start
```

### Additional Scripts

```bash
# Lint the code
npm run lint

# Analyze body coordinates (utility script)
npm run analyze-body-coords
```

## Project Structure

```
omerald/
├── public/                 # Static assets
│   ├── pictures/          # Image assets
│   ├── icons/             # App icons
│   └── ...
├── src/
│   ├── components/        # React components
│   │   ├── atoms/        # Atomic components
│   │   ├── molecules/    # Molecule components
│   │   ├── organisms/    # Organism components
│   │   └── templates/    # Template layouts
│   ├── hooks/            # Custom React hooks
│   │   └── reactQuery/   # React Query hooks
│   ├── lib/              # Utility libraries
│   │   ├── db.ts         # MongoDB connection
│   │   ├── mysql/        # MySQL connection
│   │   ├── models/       # Database models
│   │   └── utils/        # Utility functions
│   ├── pages/            # Next.js pages and API routes
│   │   ├── api/          # Backend API endpoints
│   │   └── ...           # Frontend pages
│   └── styles/           # Global styles
├── scripts/              # Utility scripts
├── .env.local           # Environment variables (create this)
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary. All rights reserved.

## Support

For support, email developer.support@omerald.com or visit our website.

## Acknowledgments

- Built with Next.js and React
- Authentication powered by Clerk
- AI analysis powered by OpenAI
- Cloud storage provided by AWS S3
- Payment processing by Razorpay
