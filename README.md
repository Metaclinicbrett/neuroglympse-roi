# NeuroGlympse Proforma Site

Email-gated ROI calculator for the NeuroGlympse adaptive care model.

## Live Deployment

**Production URL**: https://proforma-site.vercel.app

Automatic deployments are enabled via GitHub integration. Every push to the `main` branch automatically deploys to production.

## Features

- **Email Gate**: Collects user email before showing the proforma calculator
- **Email Notifications**: Sends notification to sales@neuroglympse.com (CC: brett@neuroglympse.com)
- **Interactive Calculator**: Full ROI predictor with charts and CSV export

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Email Setup (EmailJS)

1. Go to [emailjs.com](https://www.emailjs.com/) and create a free account
2. **Add an Email Service** (e.g., Gmail, Outlook)
3. **Create an Email Template** with this content:
   - **Subject**: `PROFORMA User`
   - **To Email**: Use variable `{{to_email}}`
   - **CC**: Use variable `{{cc_email}}`
   - **Body**: 
     ```
     New proforma access request from: {{user_email}}
     
     {{message}}
     ```
4. Get your credentials:
   - Service ID (e.g., `service_xxx`)
   - Template ID (e.g., `template_xxx`)
   - Public Key (from Account > API Keys)

5. Update `src/components/EmailGate.jsx`:
   ```javascript
   const EMAILJS_SERVICE_ID = 'your_service_id';
   const EMAILJS_TEMPLATE_ID = 'your_template_id'; 
   const EMAILJS_PUBLIC_KEY = 'your_public_key';
   ```

## Deploy to GoDaddy

### Option 1: Upload Static Files (Recommended)

1. Build the project:
   ```bash
   npm run build
   ```

2. Upload the `dist/` folder contents to GoDaddy:
   - Log in to GoDaddy → My Products → Web Hosting → Manage
   - Open **cPanel** → **File Manager**
   - Navigate to `public_html` (or create a subdomain folder)
   - Upload all files from your local `dist/` folder

3. Set up DNS for `proforma.neuroglympse.com`:
   - In GoDaddy DNS, add a **CNAME** record:
     - Name: `proforma`
     - Value: Points to your hosting

### Option 2: Deploy to Vercel (Easier)

1. Push code to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add custom domain in Vercel settings
4. In GoDaddy DNS, add CNAME:
   - Name: `proforma`
   - Value: `cname.vercel-dns.com`

## Reset Email Gate (Testing)

To reset the email gate during testing, run in browser console:
```javascript
localStorage.removeItem('proforma_user_email')
location.reload()
```

## Project Structure

```
proforma-site/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── EmailGate.jsx   # Email capture gate
│   │   └── NeuroROI.jsx    # Main calculator
│   ├── lib/utils.js     # Utility functions
│   ├── App.jsx          # Main app with gate logic
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
└── package.json
```
