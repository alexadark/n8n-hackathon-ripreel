"use server";

import { createClient as createSupabase } from "@supabase/supabase-js";

// Helper to create Supabase client with service role key (demo mode - no auth)
function getStorageClient() {
  return createSupabase(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Alias for legacy code that uses createClient
const createClient = getStorageClient;

// Base auth result type for consistent responses
export type AuthResult = {
  success: boolean;
  error?: string;
};

/**
 * Server-side login action
 * Authenticates user with email and password, then redirects to appropriate page
 */
export async function loginAction(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Server-side signup action
 * Creates new user account with email verification
 */
export async function signUpAction(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResult> {
  const supabase = await createClient();

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/chat`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    console.error("Signup error:", error);
    // Provide helpful error messages for common signup issues
    if (error.message.includes("already registered")) {
      return {
        success: false,
        error:
          "An account with this email already exists. Try logging in instead.",
      };
    }

    return { success: false, error: error.message };
  }

  // Check if user already exists and is verified
  if (data.user && data.user.identities && data.user.identities.length > 0) {
    const identity = data.user.identities[0];
    const emailVerified = identity.identity_data?.email_verified;

    console.log("User exists, email verified:", emailVerified);

    if (emailVerified === true) {
      // User exists and email is already verified - they should log in instead
      return {
        success: false,
        error: "Account already exists and is verified. Please log in instead.",
      };
    }

    // If emailVerified is false, this means user exists but hasn't verified email yet
    // This is fine - they can receive another confirmation email
  } else {
    return {
      success: false,
      error: "Account already exists. Please log in instead.",
    };
  }

  // If no error, signup was successful - user needs to check email for verification
  return { success: true };
}

/**
 * Server-side logout action
 * Terminates user session
 */
export async function logoutAction(): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Server-side password reset action
 * Sends password reset email to user
 */
export async function resetPasswordAction(email: string): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/confirm?next=/auth/update-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Server-side password update action
 * Updates user's password when authenticated
 */
export async function updatePasswordAction(
  password: string
): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
