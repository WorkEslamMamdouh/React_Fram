"use client"
import { Sys } from "../Shared/SystemTools";
import { useEffect, useRef, useState } from "react";
import { useSys } from "../Shared/SystemUsing";  
import { OpenPage } from "../Shared/App";
import { useRouter } from "next/navigation";
import { SQL } from "../Shared/CallDataBase";

// =======================
// Register Page  
// =======================
export function Register() {
    const Router = useRouter();
    const didRun = useRef(false);
    
    // State for form fields
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // =======================
    // #region UsingSystem Glopal
    // =======================
    const ShowLoader = useSys((s) => s.ShowLoader);
    const CloseLoader = useSys((s) => s.CloseLoader);
    const IsLangEN = useSys((s) => s.IsLangEN);
    // #endregion

    // =======================
    // #region InitalizeControls  
    // ======================= 
    const regName = useRef<HTMLInputElement>(null)
    const regEmail = useRef<HTMLInputElement>(null)
    const regPassword = useRef<HTMLInputElement>(null)
    const regConfirmPassword = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;
        InitalizeComponent();
    }, []);

    function InitalizeComponent() {
        regName.current?.focus();
        InitializeEvents();
    }

    function InitializeEvents() {
        // Add enter key events if needed
    }

    // =======================
    // #region Validation Functions
    // =======================
    
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return {
            isValid: passwordRegex.test(password),
            hasMinLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecialChar: /[@$!%*?&]/.test(password)
        };
    };

    // =======================
    // #region Events Elements Html
    // =======================

    async function handleRegister() {
        // Reset any previous messages
        // Sys.HideMessage();
        
        // Validate Full Name
        if (!fullName.trim()) {
            Sys.ErrorInput(regName.current, {
                messageEn: "Full name is required",
                messageAr: "الاسم الكامل مطلوب"
            });
            return;
        }
        
        if (fullName.trim().length < 3) {
            Sys.ErrorInput(regName.current, {
                messageEn: "Full name must be at least 3 characters",
                messageAr: "الاسم الكامل يجب أن يكون 3 أحرف على الأقل"
            });
            return;
        }
        
        // Validate Email
        if (!email.trim()) {
            Sys.ErrorInput(regEmail.current, {
                messageEn: "Email is required",
                messageAr: "البريد الإلكتروني مطلوب"
            });
            return;
        }
        
        if (!validateEmail(email)) {
            Sys.ErrorInput(regEmail.current, {
                messageEn: "Please enter a valid email address",
                messageAr: "يرجى إدخال بريد إلكتروني صحيح"
            });
            return;
        }
        
        // Validate Password
        if (!password) {
            Sys.ErrorInput(regPassword.current, {
                messageEn: "Password is required",
                messageAr: "كلمة المرور مطلوبة"
            });
            return;
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            let errorMessageEn = "Password must contain:";
            let errorMessageAr = "كلمة المرور يجب أن تحتوي على:";
            
            if (!passwordValidation.hasMinLength) {
                errorMessageEn += "\n- At least 8 characters";
                errorMessageAr += "\n- 8 أحرف على الأقل";
            }
            if (!passwordValidation.hasUpperCase) {
                errorMessageEn += "\n- One uppercase letter";
                errorMessageAr += "\n- حرف كبير واحد";
            }
            if (!passwordValidation.hasLowerCase) {
                errorMessageEn += "\n- One lowercase letter";
                errorMessageAr += "\n- حرف صغير واحد";
            }
            if (!passwordValidation.hasNumber) {
                errorMessageEn += "\n- One number";
                errorMessageAr += "\n- رقم واحد";
            }
            if (!passwordValidation.hasSpecialChar) {
                errorMessageEn += "\n- One special character (@$!%*?&)";
                errorMessageAr += "\n- رمز خاص واحد (@$!%*?&)";
            }
            
            Sys.ShowMessage(errorMessageEn, errorMessageAr, "error");
            return;
        }
        
        // Validate Confirm Password
        if (password !== confirmPassword) {
            Sys.ErrorInput(regConfirmPassword.current, {
                messageEn: "Passwords do not match",
                messageAr: "كلمات المرور غير متطابقة"
            });
            return;
        }
        
        // Validate Terms
        if (!agreeTerms) {
            Sys.ShowMessage(
                "Please agree to the Terms and Conditions",
                "يرجى الموافقة على الشروط والأحكام",
                "error"
            );
            return;
        }
        
        // Call API to register
        await CallAPI_Register();
    }
    
    async function CallAPI_Register() {
        setIsLoading(true);
        
        await Sys.CallApi<any>({
            method: "POST",
            controller: "auth",
            action: "register",
            data: {
                FullName: fullName,
                Email: email,
                Password: password
            },
            
            onSuccess: (res) => {
                setIsLoading(false);
                if (res.IsSuccess) {
                    Sys.ShowMessage(
                        "Registration successful! Please login to continue.",
                        "تم التسجيل بنجاح! يرجى تسجيل الدخول للمتابعة.",
                        "success"
                    );
                    // Redirect to login after 2 seconds
                    setTimeout(() => {
                        OpenPage("Login", Router);
                    }, 2000);
                } else {
                    const errorMsg = res.ErrorMessage || "Registration failed";
                    Sys.ShowMessage(
                        errorMsg,
                        "فشل التسجيل",
                        "error"
                    );
                }
            },
            
            onError: (err) => {
                setIsLoading(false);
                console.error("Registration error:", err);
                Sys.ShowMessage(
                    "Connection error. Please try again.",
                    "خطأ في الاتصال. يرجى المحاولة مرة أخرى.",
                    "error"
                );
            }
        }, {
            show: ShowLoader,
            hide: CloseLoader
        });
    }

    function showLoginScreen() {
        OpenPage("Login", Router);
    }

    function togglePasswordVisibility() {
        setShowPassword(!showPassword);
    }

    function toggleConfirmPasswordVisibility() {
        setShowConfirmPassword(!showConfirmPassword);
    }

    // #endregion

    // =======================
    // UI
    // =======================
    const state = {
        fullName,
        email,
        password,
        confirmPassword,
        agreeTerms,
        showPassword,
        showConfirmPassword,
        isLoading,
        IsLangEN
    };

    const actions = {
        handleRegister,
        showLoginScreen,
        setFullName,
        setEmail,
        setPassword,
        setConfirmPassword,
        setAgreeTerms,
        togglePasswordVisibility,
        toggleConfirmPasswordVisibility
    };

    const elements = {
        regName,
        regEmail,
        regPassword,
        regConfirmPassword
    };

    return {
        ...state,
        ...actions,
        ...elements
    };
}