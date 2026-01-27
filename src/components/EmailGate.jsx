import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

// EmailJS Configuration - You'll need to set these up at https://emailjs.com
// 1. Create a free account
// 2. Add an email service (Gmail, Outlook, etc.)
// 3. Create an email template with variables: {{user_email}}, {{to_email}}, {{cc_email}}
// 4. Get your Service ID, Template ID, and Public Key
const EMAILJS_SERVICE_ID = 'service_a9eb9hn'; // Replace with your service ID
const EMAILJS_TEMPLATE_ID = 'template_6m7afq9'; // Replace with your template ID  
const EMAILJS_PUBLIC_KEY = 'FjHVT1Qy6pEksfIJQ'; // Replace with your public key

export default function EmailGate({ onUnlock }) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            // Send email notification via EmailJS
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    from_name: 'Proforma User',
                    from_email: email,
                    to_name: 'NeuroGlympse Sales',
                    message: `New proforma access request from: ${email}`,
                    reply_to: email,
                },
                EMAILJS_PUBLIC_KEY
            );

            // Store email in localStorage
            localStorage.setItem('proforma_user_email', email);

            // Unlock the proforma
            onUnlock(email);
        } catch (err) {
            console.error('Email send failed:', err);
            // Still unlock even if email fails - just log it
            localStorage.setItem('proforma_user_email', email);
            onUnlock(email);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative w-full max-w-md">
                {/* Glass card */}
                <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 md:p-10">
                    {/* Logo / Icon */}
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-60" />
                            <div className="relative bg-gradient-to-r from-indigo-500 to-purple-500 p-4 rounded-2xl">
                                <Sparkles className="h-8 w-8 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            NeuroGlympse Care Model
                        </h1>
                        <p className="text-slate-300 text-sm md:text-base">
                            Access our interactive revenue predictor by entering your email below
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <Input
                                type="email"
                                placeholder="Enter your work email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-12 h-14 bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl text-base focus:bg-white/15 transition-colors"
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading || !email}
                            className="w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl text-base transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Access Revenue Predictor
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-slate-400 text-xs mt-6">
                        By continuing, you agree to receive communications from NeuroGlympse
                    </p>
                </div>

                {/* Brand */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Powered by <span className="text-purple-400">NeuroGlympse</span>
                </p>
            </div>
        </div>
    );
}
