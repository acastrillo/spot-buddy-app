/**
 * Extended Stripe type definitions
 *
 * This file provides type-safe access to Stripe properties that exist at runtime
 * but are not included in the official @types/stripe definitions or are marked
 * as expandable properties.
 *
 * These types are based on the Stripe API documentation:
 * https://stripe.com/docs/api
 */

import type Stripe from 'stripe';

/**
 * Extended Invoice type with additional runtime properties
 *
 * The official Stripe types mark some properties as expandable, which means
 * they can be either an ID string or the full object. In webhook handlers,
 * we often receive expanded objects with additional metadata properties.
 */
export interface StripeInvoiceExtended extends Omit<Stripe.Invoice, 'customer_email' | 'subscription' | 'parent'> {
  /**
   * Email of the customer associated with this invoice
   * Present in webhook payloads even though not in official types
   */
  customer_email?: string | null;

  /**
   * Subscription associated with this invoice
   * Can be string ID or full Subscription object with metadata
   */
  subscription?: string | StripeSubscriptionWithMetadata | null;

  /**
   * Details about the subscription for this invoice
   * Present in newer webhook payloads
   */
  subscription_details?: {
    metadata?: Record<string, string>;
  } | null;

  /**
   * Parent invoice reference for prorations
   * Contains nested subscription details
   */
  parent?: {
    subscription_details?: {
      metadata?: Record<string, string>;
    };
  } | null;
}

/**
 * Subscription with typed metadata
 *
 * Note: This interface extends Stripe.Subscription and makes certain
 * properties non-optional for our internal type safety. At runtime,
 * these properties are guaranteed to exist based on Stripe's API contracts.
 */
export interface StripeSubscriptionWithMetadata extends Omit<Stripe.Subscription, 'cancel_at' | 'trial_end'> {
  /**
   * Unix timestamp for when the current period started
   * This is present in the API but typed as expandable
   */
  current_period_start: number;

  /**
   * Unix timestamp for when the current period ends
   */
  current_period_end: number;

  /**
   * Unix timestamp for when trial ends (if applicable)
   * Matches Stripe's base type exactly
   */
  trial_end: number | null;

  /**
   * Unix timestamp for when subscription will be canceled
   * Matches Stripe's base type exactly
   */
  cancel_at: number | null;

  /**
   * Metadata with our custom fields
   * Stripe.Metadata requires string values (no undefined)
   */
  metadata: Stripe.Metadata;
}

/**
 * Checkout Session with typed metadata
 */
export interface StripeCheckoutSessionExtended extends Omit<Stripe.Checkout.Session, 'customer_email' | 'metadata'> {
  /**
   * Email address of the customer
   * Deprecated in favor of customer_details.email but still present
   */
  customer_email?: string | null;

  /**
   * Metadata with our custom fields
   */
  metadata?: {
    userId?: string;
    tier?: string;
    [key: string]: string | undefined;
  } | null;
}

/**
 * Type guard to check if a value is a Stripe Subscription object
 */
export function isStripeSubscription(
  value: string | Stripe.Subscription | null | undefined
): value is Stripe.Subscription {
  return typeof value === 'object' && value !== null && 'id' in value;
}

/**
 * Type guard to check if a value is a Stripe Customer object
 */
export function isStripeCustomer(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): value is Stripe.Customer {
  return typeof value === 'object' && value !== null && 'id' in value && !('deleted' in value);
}

/**
 * Type guard to check if a value is a Stripe Invoice object with extended properties
 */
export function isStripeInvoiceExtended(
  value: Stripe.Invoice | StripeInvoiceExtended
): value is StripeInvoiceExtended {
  return 'id' in value;
}

/**
 * Safely extract customer ID from various Stripe customer types
 */
export function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

/**
 * Safely extract customer email from various Stripe customer types
 */
export function getCustomerEmail(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer || typeof customer === 'string') return null;
  if ('deleted' in customer) return null;
  return customer.email || null;
}

/**
 * Safely extract subscription ID from various Stripe subscription types
 */
export function getSubscriptionId(
  subscription: string | Stripe.Subscription | null | undefined
): string | null {
  if (!subscription) return null;
  return typeof subscription === 'string' ? subscription : subscription.id;
}

/**
 * Type-safe accessor for invoice customer_email
 * Handles the fact that this property exists at runtime but isn't in types
 */
export function getInvoiceCustomerEmail(invoice: Stripe.Invoice): string | null {
  const extended = invoice as StripeInvoiceExtended;
  return extended.customer_email || null;
}

/**
 * Type-safe accessor for subscription metadata from invoice
 */
export function getInvoiceSubscriptionMetadata(
  invoice: Stripe.Invoice
): Record<string, string> | null {
  const extended = invoice as StripeInvoiceExtended;

  // Try subscription_details first (newer format)
  if (extended.subscription_details?.metadata) {
    return extended.subscription_details.metadata;
  }

  // Try parent.subscription_details (prorations)
  if (extended.parent?.subscription_details?.metadata) {
    return extended.parent.subscription_details.metadata;
  }

  // Try direct metadata
  if (extended.metadata && Object.keys(extended.metadata).length > 0) {
    return extended.metadata as Record<string, string>;
  }

  // Try subscription object metadata if expanded
  if (extended.subscription && typeof extended.subscription !== 'string') {
    return extended.subscription.metadata || null;
  }

  return null;
}

/**
 * Type-safe accessor for subscription timestamps
 * Converts Stripe's number | null to Date | null
 */
export function getSubscriptionDate(
  timestamp: number | null
): Date | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000);
}

/**
 * Extract userId from various Stripe metadata locations
 */
export function extractUserId(
  metadata: Record<string, string | undefined> | null | undefined
): string | null {
  if (!metadata) return null;
  return metadata.userId || metadata.user_id || null;
}

/**
 * Extract tier from various Stripe metadata locations
 */
export function extractTier(
  metadata: Record<string, string | undefined> | null | undefined
): string | null {
  if (!metadata) return null;
  return metadata.tier || null;
}
