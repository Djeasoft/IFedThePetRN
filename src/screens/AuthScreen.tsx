// AuthScreen.tsx - Landing, Sign Up, Login, Email Verification, Password Reset
// Version: 1.0.0 - Supabase Auth with Email/Password, Apple, Google

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useThemeColors } from '../contexts/ThemeContext';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  isAppleSignInAvailable,
  resetPassword,
  resendVerificationEmail,
  refreshSession,
} from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

type AuthStep = 'landing' | 'signup' | 'login' | 'verification' | 'reset-password';

export function AuthScreen() {
  const theme = useThemeColors();
  const { user } = useAuth();

  const [step, setStep] = useState<AuthStep>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleBack = () => {
    if (step === 'signup' || step === 'login') {
      setStep('landing');
    } else if (step === 'reset-password') {
      setStep('login');
    }
    setError('');
    setResetSent(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signUpWithEmail(trimmedEmail, password);
      setStep('verification');
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signInWithEmail(trimmedEmail, password);
      // Auth state change listener in AuthContext handles navigation
    } catch (err: any) {
      setError('Invalid email and password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithApple();
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') return;
      setError(err.message || 'Apple sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await resetPassword(trimmedEmail);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendVerificationEmail(email);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    }
  };

  const handleCheckVerification = async () => {
    setLoading(true);
    setError('');
    try {
      const { user: refreshedUser } = await refreshSession();
      if (refreshedUser?.email_confirmed_at) {
        // AuthContext will pick up the verified state
      } else {
        setError('Email not yet verified. Please check your inbox.');
      }
    } catch (err: any) {
      setError('Unable to check verification status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Logo size="large" />
            </View>

            {/* Error Banner */}
            {error && (step === 'login' || step === 'signup') && (
              <View style={[styles.errorBanner, { backgroundColor: theme.error }]}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* LANDING SCREEN */}
            {step === 'landing' && (
              <View style={styles.stepContainer}>
                {/* Social Sign-In Buttons */}
                <View style={styles.socialButtons}>
                  {appleAvailable && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={borderRadius.lg}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  )}

                  <TouchableOpacity
                    style={[
                      styles.googleButton,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={handleGoogleSignIn}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Ionicons name="logo-google" size={20} color={theme.text} />
                    <Text style={[styles.googleButtonText, { color: theme.text }]}>
                      Continue with Google
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                </View>

                {/* Email Sign Up */}
                <Button
                  onPress={() => {
                    setStep('signup');
                    setError('');
                    setEmail('');
                    setPassword('');
                  }}
                  variant="primary"
                  size="lg"
                  fullWidth
                >
                  Sign up free with email
                </Button>

                {/* Login Link */}
                <TouchableOpacity
                  onPress={() => {
                    setStep('login');
                    setError('');
                    setEmail('');
                    setPassword('');
                  }}
                  style={styles.loginLink}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.loginLinkText, { color: theme.textSecondary }]}>
                    Already have an account?{' '}
                    <Text style={{ color: theme.primary, fontWeight: fontWeight.semibold }}>
                      Login
                    </Text>
                  </Text>
                </TouchableOpacity>

                {loading && (
                  <ActivityIndicator
                    size="small"
                    color={theme.primary}
                    style={styles.loadingIndicator}
                  />
                )}
              </View>
            )}

            {/* SIGN UP SCREEN */}
            {step === 'signup' && (
              <View style={styles.stepContainer}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                  <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headingSection}>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Please enter your email address{'\n'}and password
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <Input
                    label="What's your email?"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError('');
                    }}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="next"
                  />

                  <Input
                    label="Please enter a password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setError('');
                    }}
                    placeholder="6 characters or more"
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                  />

                  <Button
                    onPress={handleSignUp}
                    disabled={!email.trim() || password.length < 6}
                    loading={loading}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    Continue
                  </Button>
                </View>
              </View>
            )}

            {/* LOGIN SCREEN */}
            {step === 'login' && (
              <View style={styles.stepContainer}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                  <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headingSection}>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Please enter your email address{'\n'}and password
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <Input
                    label="What's your email?"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError('');
                    }}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="next"
                  />

                  <Input
                    label="Please enter a password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setError('');
                    }}
                    placeholder="Password"
                    secureTextEntry
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />

                  <Button
                    onPress={handleLogin}
                    disabled={!email.trim() || !password}
                    loading={loading}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    Continue
                  </Button>

                  <TouchableOpacity
                    onPress={() => {
                      setStep('reset-password');
                      setError('');
                    }}
                    style={styles.resetLink}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.resetLinkText, { color: theme.primary }]}>
                      Reset Password
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* EMAIL VERIFICATION SCREEN */}
            {step === 'verification' && (
              <View style={styles.stepContainer}>
                <View style={styles.verificationContainer}>
                  <Ionicons name="mail-outline" size={64} color={theme.primary} />

                  <Text style={[styles.heading, { color: theme.text }]}>
                    Check your email
                  </Text>

                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    We sent a verification link to{'\n'}
                    <Text style={{ fontWeight: fontWeight.semibold, color: theme.text }}>
                      {email}
                    </Text>
                  </Text>

                  {error ? (
                    <Text style={[styles.verificationError, { color: theme.error }]}>
                      {error}
                    </Text>
                  ) : null}

                  <View style={styles.verificationActions}>
                    <Button
                      onPress={handleCheckVerification}
                      loading={loading}
                      variant="primary"
                      size="lg"
                      fullWidth
                    >
                      I've verified my email
                    </Button>

                    <Button
                      onPress={handleResendVerification}
                      disabled={resendCooldown > 0}
                      variant="ghost"
                      size="md"
                      fullWidth
                    >
                      {resendCooldown > 0
                        ? `Resend email (${resendCooldown}s)`
                        : 'Resend verification email'}
                    </Button>
                  </View>
                </View>
              </View>
            )}

            {/* RESET PASSWORD SCREEN */}
            {step === 'reset-password' && (
              <View style={styles.stepContainer}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                  <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headingSection}>
                  <Text style={[styles.heading, { color: theme.text }]}>
                    Reset Password
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Enter your email and we'll send you a reset link
                  </Text>
                </View>

                <View style={styles.formSection}>
                  {resetSent ? (
                    <View style={styles.resetSentContainer}>
                      <Ionicons name="checkmark-circle" size={48} color={theme.success} />
                      <Text style={[styles.resetSentText, { color: theme.text }]}>
                        Reset link sent!
                      </Text>
                      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        Check your email for a password reset link
                      </Text>
                      <Button
                        onPress={() => {
                          setStep('login');
                          setResetSent(false);
                        }}
                        variant="primary"
                        size="lg"
                        fullWidth
                        style={{ marginTop: spacing.lg }}
                      >
                        Back to Login
                      </Button>
                    </View>
                  ) : (
                    <>
                      <Input
                        label="What's your email?"
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          setError('');
                        }}
                        placeholder="Email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleResetPassword}
                        error={error}
                      />

                      <Button
                        onPress={handleResetPassword}
                        disabled={!email.trim()}
                        loading={loading}
                        variant="primary"
                        size="lg"
                        fullWidth
                      >
                        Send Reset Link
                      </Button>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.huge,
  },
  stepContainer: {
    width: '100%',
    maxWidth: 400,
  },

  // Error banner
  errorBanner: {
    width: '100%',
    maxWidth: 400,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },

  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },

  // Headings
  headingSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
    lineHeight: 22,
  },

  // Social buttons
  socialButtons: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  googleButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: spacing.base,
    fontSize: fontSize.sm,
  },

  // Form section
  formSection: {
    width: '100%',
    gap: spacing.lg,
  },

  // Login link
  loginLink: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: fontSize.base,
  },

  // Reset password link
  resetLink: {
    alignItems: 'center',
  },
  resetLinkText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },

  // Loading
  loadingIndicator: {
    marginTop: spacing.lg,
  },

  // Verification
  verificationContainer: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  verificationError: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  verificationActions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
  },

  // Reset sent
  resetSentContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  resetSentText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
});
