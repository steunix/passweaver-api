/**
 * Rate limiter module
 * @module lib/random
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { rateLimit } from 'express-rate-limit'

// Rate limit middleware
const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10000,
  message: "Rate limit exceeded",
  headers: true,
});

export default rateLimitMiddleware