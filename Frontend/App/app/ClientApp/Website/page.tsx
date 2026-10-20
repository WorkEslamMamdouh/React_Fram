"use client"

import React, { useEffect, useRef, useState } from 'react';
import { OpenPage } from "../Shared/App";
import { useRouter } from "next/navigation";

// -------------------- الأنواع (Types) --------------------
interface PricingPlan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  currency: string;
  period: string;
  periodAr: string;
  features: string[];
  featuresAr: string[];
  icon: string;
  isPopular?: boolean;
  buttonText: string;
  buttonTextAr: string;
}

// -------------------- الترجمات (Translations) --------------------
const translations = {
  en: {
    companyName: "ESSA",
    slogan: "Integrated Enterprise Management Solution",
    navLogin: "Login",
    heroTitle: "ESSA System",
    heroTitleHighlight: "to Manage Your Business Intelligently",
    heroDesc: "Smart solutions for managing resources, sales, inventory, and human resources in one integrated platform.",
    stats: [
      { value: "5000+", label: "Clients" },
      { value: "98%", label: "Satisfaction" },
      { value: "24/7", label: "Support" }
    ],
    pricingTitle: "Subscription Plans",
    pricingSubtitle: "Choose the perfect plan for your business needs",
    choosePlan: "Choose Plan",
    mostPopular: "",
    footerDesc: "Leading ERP solutions provider since 2010",
    contact: "Contact Us",
    follow: "Follow Us",
    email: "info@ESSA.com",
    phone: "+966 123 456 789",
    rights: "All rights reserved",
    getStarted: "Get Started",
    featuresTitle: "Powerful Features for Modern Business",
    featuresSubtitle: "Everything you need to manage your enterprise efficiently",
    whyUsTitle: "Why Choose ESSA?",
    whyUsDesc: "We provide enterprise-grade solutions trusted by industry leaders worldwide.",
    testimonialTitle: "Trusted by Industry Leaders",
    testimonialText: "The most comprehensive ERP solution we've ever implemented. It transformed our operations completely.",
    testimonialAuthor: "Sarah Ahmed",
    testimonialRole: "CTO, TechCorp",
    ctaTitle: "Ready to Transform Your Business?",
    ctaDesc: "Join thousands of companies using ESSA",
    ctaButton: "Start Free Trial"
  },
  ar: {
    companyName: "نيكسوس إي آر بي",
    slogan: "حل متكامل لإدارة المؤسسات",
    navLogin: "تسجيل الدخول",
    heroTitle: "نظام ERP متكامل",
    heroTitleHighlight: "لإدارة أعمالك بذكاء",
    heroDesc: "حلول ذكية لإدارة الموارد والمبيعات والمخزون والموارد البشرية في منصة واحدة متكاملة.",
    stats: [
      { value: "٥٠٠٠+", label: "عميل" },
      { value: "٩٨٪", label: "رضا العملاء" },
      { value: "٢٤/٧", label: "دعم فني" }
    ],
    pricingTitle: "باقات الاشتراك",
    pricingSubtitle: "اختر الباقة المناسبة لاحتياجات عملك",
    choosePlan: "اختر الباقة",
    mostPopular: "",
    footerDesc: "المزود الرائد لحلول ERP منذ ٢٠١٠",
    contact: "اتصل بنا",
    follow: "تابعنا",
    email: "info@ESSA.com",
    phone: "+٩٦٦ ١٢٣ ٤٥٦ ٧٨٩",
    rights: "جميع الحقوق محفوظة",
    getStarted: "ابدأ الآن",
    featuresTitle: "ميزات قوية للأعمال الحديثة",
    featuresSubtitle: "كل ما تحتاجه لإدارة مؤسستك بكفاءة",
    whyUsTitle: "لماذا تختار نيكسوس إي آر بي؟",
    whyUsDesc: "نحن نقدم حلولاً على مستوى المؤسسات موثوق بها من قبل قادة الصناعة في جميع أنحاء العالم.",
    testimonialTitle: "موثوق من قبل قادة الصناعة",
    testimonialText: "أكثر حل ERP شمولاً قمنا بتنفيذه على الإطلاق. لقد غيّر عملياتنا بالكامل.",
    testimonialAuthor: "سارة أحمد",
    testimonialRole: "مديرة التكنولوجيا، تك كورب",
    ctaTitle: "مستعد لتحويل أعمالك؟",
    ctaDesc: "انضم إلى آلاف الشركات التي تستخدم نيكسوس إي آر بي",
    ctaButton: "ابدأ النسخة التجريبية"
  }
};

// -------------------- المكونات (Components) --------------------
 

// مكون شريط التنقل (Navbar) مع زر اللغة المدمج
const Navbar = ({ t, scrolled, onLogin, language, onToggleLanguage }: { 
  t: any; 
  scrolled: boolean; 
  onLogin: () => void;
  language: "en" | "ar";
  onToggleLanguage: () => void;
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className={`fixed top-0 w-full z-40 transition-all duration-300 ${
      scrolled 
        ? "bg-white/95 backdrop-blur-md shadow-lg dark:bg-neutral-900/95" 
        : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t.companyName}
            </h1>
            <p className="text-xs text-gray-500 dark:text-neutral-400 hidden sm:block">
              {t.slogan}
            </p>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Language Switcher Button */}
            <button
              onClick={onToggleLanguage}
              type="button"
              className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white/80 text-gray-800 shadow-sm hover:bg-gray-50 transition-all dark:bg-neutral-800/80 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700"
            >
              <span className="text-base">{language === "en" ? "🇸🇦" : "🇬🇧"}</span>
              <span>{language === "en" ? "العربية" : "English"}</span>
            </button>
            
            {/* Login Button */}
            <button
                  onClick={onLogin}
              className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              {t.navLogin}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Language Button (Icon only) */}
            <button
              onClick={onToggleLanguage}
              type="button"
              className="p-2 inline-flex items-center justify-center text-sm font-medium rounded-lg border border-gray-200 bg-white/80 text-gray-800 shadow-sm hover:bg-gray-50 transition-all dark:bg-neutral-800/80 dark:border-neutral-700 dark:text-white"
            >
              <span className="text-lg">{language === "en" ? "🇸🇦" : "🇬🇧"}</span>
            </button>
            
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg border border-gray-200 bg-white/80 hover:bg-gray-50 transition-all dark:bg-neutral-800/80 dark:border-neutral-700"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  onLogin();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 text-center text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                {t.navLogin}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// مقطع البطل (Hero) - مستوحى من Preline Marketing Blocks
const HeroSection = ({ t, language }: { t: any; language: "en" | "ar" }) => (
  <div className="relative overflow-hidden pt-20 md:pt-24 lg:pt-32 pb-12">
    <div className="absolute inset-0 [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_0%,var(--indigo-500)_15%,var(--blue-500)_30%,var(--cyan-500)_45%,var(--blue-500)_60%,var(--indigo-500)_100%)] [background-image:var(--aurora)] [background-size:400%] animate-aurora opacity-20"></div>
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-gray-900 dark:text-white">
        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {t.heroTitle}
        </span>
        <br />
        <span className="text-gray-800 dark:text-white">{t.heroTitleHighlight}</span>
      </h1>
      <p className="mx-auto mt-4 md:mt-6 max-w-2xl text-base md:text-lg text-gray-600 dark:text-neutral-400 px-4">
        {t.heroDesc}
      </p>
      <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
        <button className="w-full sm:w-auto rounded-md bg-indigo-600 px-4 md:px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all">
          {t.getStarted}
        </button>
      </div>
      <div className="mt-10 md:mt-12 flex flex-wrap justify-center gap-6 md:gap-8 px-4">
        {t.stats.map((stat: any, idx: number) => (
          <div key={idx} className="text-center min-w-[80px]">
            <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-neutral-400">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// مقطع الميزات (Features Grid)
const FeaturesSection = ({ t, isVisible }: { t: any; isVisible: boolean }) => {
  const features = [
    { icon: "🚀", title: "Scalable Platform", desc: "Grows with your business needs" },
    { icon: "🔒", title: "Enterprise Security", desc: "Bank-grade data protection" },
    { icon: "🔄", title: "Real-time Sync", desc: "Always up-to-date information" },
    { icon: "💡", title: "AI Analytics", desc: "Smart business insights" },
  ];
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t.featuresTitle}</h2>
        <p className="mt-3 md:mt-4 text-base md:text-lg text-gray-600 dark:text-neutral-400 px-4">{t.featuresSubtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, idx) => (
          <div key={idx} className="group p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-neutral-700">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
            <p className="mt-2 text-sm md:text-base text-gray-500 dark:text-neutral-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// مقطع بطاقات الأسعار (Pricing)
const PricingSection = ({ t, language, onChoosePlan, selectedPlan, isVisible }: any) => {
  const pricingPlans: PricingPlan[] = [
    { id: "basic", name: "Basic", nameAr: "أساسي", price: 49, currency: "$", period: "/month", periodAr: "/شهر", features: ["5 Users", "Core Features", "Email Support"], featuresAr: ["٥ مستخدمين", "ميزات أساسية", "دعم بالبريد"], icon: "💎", buttonText: t.choosePlan, buttonTextAr: translations.ar.choosePlan },
    { id: "pro", name: "Professional", nameAr: "احترافي", price: 99, currency: "$", period: "/month", periodAr: "/شهر", features: ["20 Users", "Advanced Analytics", "Priority Support"], featuresAr: ["٢٠ مستخدم", "تحليلات متقدمة", "دعم أولوية"], icon: "👑", isPopular: true, buttonText: t.choosePlan, buttonTextAr: translations.ar.choosePlan },
    { id: "enterprise", name: "Enterprise", nameAr: "مؤسسي", price: 199, currency: "$", period: "/month", periodAr: "/شهر", features: ["Unlimited", "Custom Solutions", "24/7 Dedicated Support"], featuresAr: ["غير محدود", "حلول مخصصة", "دعم مخصص ٢٤/٧"], icon: "🏢", buttonText: t.choosePlan, buttonTextAr: translations.ar.choosePlan },
  ];

  return (
    <div className={`bg-gray-50 dark:bg-neutral-900 py-16 md:py-24 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t.pricingTitle}</h2>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-gray-600 dark:text-neutral-400">{t.pricingSubtitle}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {pricingPlans.map((plan) => (
            <div key={plan.id} className={`relative p-6 md:p-8 bg-white dark:bg-neutral-800 rounded-2xl shadow-lg hover:shadow-xl transition-all ${plan.isPopular ? 'ring-2 ring-indigo-600 md:scale-105 z-10' : ''}`}>
              {/* {plan.isPopular && <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">{t.mostPopular}</span>} */}
              <div className="text-4xl mb-4">{plan.icon}</div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{language === 'en' ? plan.name : plan.nameAr}</h3>
              <div className="mt-4 mb-6">
                <span className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white">{plan.currency}{plan.price}</span>
                <span className="text-gray-500 dark:text-neutral-400">{language === 'en' ? plan.period : plan.periodAr}</span>
              </div>
              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                {(language === 'en' ? plan.features : plan.featuresAr).map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm md:text-base text-gray-600 dark:text-neutral-300">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => onChoosePlan(plan.id)} className={`w-full py-2.5 md:py-3 rounded-lg font-semibold transition-all ${selectedPlan === plan.id ? 'bg-green-600 text-white' : plan.isPopular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-neutral-700 dark:text-white'}`}>
                {selectedPlan === plan.id ? (language === 'en' ? '✓ Selected' : '✓ تم الاختيار') : (language === 'en' ? plan.buttonText : plan.buttonTextAr)}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// مقطع شهادات العملاء (Testimonial)
const TestimonialSection = ({ t, isVisible }: { t: any; isVisible: boolean }) => (
  <div className={`py-16 md:py-24 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">{t.testimonialTitle}</h2>
      </div>
      <div className="max-w-3xl mx-auto text-center px-4">
        <svg className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="mt-6 text-lg md:text-xl italic text-gray-600 dark:text-neutral-400">{t.testimonialText}</p>
        <div className="mt-6">
          <span className="font-semibold text-gray-900 dark:text-white">{t.testimonialAuthor}</span>
          <span className="text-gray-500 dark:text-neutral-400"> – {t.testimonialRole}</span>
        </div>
      </div>
    </div>
  </div>
);

// مقطع الحث على الشراء (CTA)
const CTASection = ({ t, isVisible }: { t: any; isVisible: boolean }) => (
  <div className={`bg-gradient-to-r from-blue-600 to-indigo-600 py-16 md:py-24 transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">{t.ctaTitle}</h2>
      <p className="text-base md:text-xl text-blue-100 mb-6 md:mb-8 px-4">{t.ctaDesc}</p>
      <button className="px-6 md:px-8 py-3 md:py-4 bg-white text-blue-600 rounded-full font-bold text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
        {t.ctaButton} 🚀
      </button>
    </div>
  </div>
);

// مقطع تذييل الصفحة (Footer)
const Footer = ({ t }: { t: any }) => (
  <footer className="bg-gray-900 text-white py-10 md:py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-bold">{t.companyName}</h3>
          <p className="text-gray-400 mt-2 text-sm">{t.footerDesc}</p>
        </div>
        <div className="text-center sm:text-left">
          <h4 className="font-semibold mb-4">{t.contact}</h4>
          <p className="text-gray-400 text-sm">📧 {t.email}<br />📞 {t.phone}</p>
        </div>
        <div className="text-center sm:text-left">
          <h4 className="font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
          </ul>
        </div>
        <div className="text-center sm:text-left">
          <h4 className="font-semibold mb-4">{t.follow}</h4>
          <div className="flex gap-4 justify-center sm:justify-start">
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">in</a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">tw</a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">fb</a>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
        <p>&copy; 2024 {t.companyName}. {t.rights}.</p>
      </div>
    </div>
  </footer>
);

// -------------------- المكون الرئيسي (Main Component) --------------------
export default function GlobalLandingPage() {


  const Router = useRouter();

  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState({ features: false, pricing: false, testimonial: false, cta: false });
  const t = translations[language];


const handleLogin = () => {
  OpenPage("Login", Router);
};

  const sectionsRef = {
    features: useRef<HTMLDivElement>(null),
    pricing: useRef<HTMLDivElement>(null),
    testimonial: useRef<HTMLDivElement>(null),
    cta: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const checkVisibility = () => {
        Object.entries(sectionsRef).forEach(([key, ref]) => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            if (rect.top < window.innerHeight - 100) {
              setVisibleSections(prev => ({ ...prev, [key]: true }));
            }
          }
        });
      };
      checkVisibility();
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    setLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };

  const handleChoosePlan = (planId: string) => setSelectedPlan(planId);

 
  return (
    <div className={`min-h-screen bg-white dark:bg-neutral-900 ${language === "ar" ? "font-arabic" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Navbar now contains the language switcher */}
      <Navbar 
        t={t} 
        scrolled={scrolled} 
        onLogin={handleLogin}
        language={language}
        onToggleLanguage={toggleLanguage}
      />
      
      <HeroSection t={t} language={language} />
      
      <div ref={sectionsRef.features}>
        <FeaturesSection t={t} isVisible={visibleSections.features} />
      </div>
      
      <div ref={sectionsRef.pricing}>
        <PricingSection 
          t={t} 
          language={language} 
          onChoosePlan={handleChoosePlan} 
          selectedPlan={selectedPlan} 
          isVisible={visibleSections.pricing} 
        />
      </div>
      
      <div ref={sectionsRef.testimonial}>
        <TestimonialSection t={t} isVisible={visibleSections.testimonial} />
      </div>
      
      <div ref={sectionsRef.cta}>
        {/* <CTASection t={t} isVisible={visibleSections.cta} /> */}
      </div>
      
      <Footer t={t} />
      
      <style jsx global>{`
        @keyframes aurora { 
          0% { background-position: 0% 50%; } 
          50% { background-position: 100% 50%; } 
          100% { background-position: 0% 50%; } 
        }
        .animate-aurora { 
          animation: aurora 8s linear infinite; 
        }
        
        @keyframes fadeInUp { 
          from { opacity: 0; transform: translateY(30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .animate-fadeInUp { 
          animation: fadeInUp 0.6s ease-out forwards; 
        }
        
        .hover-lift:hover { 
          transform: translateY(-5px); 
          transition: transform 0.3s ease; 
        }
        
        /* RTL Support for mobile menu */
        [dir="rtl"] .md\\:hidden .flex-col {
          align-items: flex-end;
        }
      `}</style>
    </div>
  );
}