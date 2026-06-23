// Custom throttle decorator for moderate rate limiting
import { Throttle } from '@nestjs/throttler';

// Strict throttle: 3 requests per 1000 seconds
export const StrictThrottle = () => {
  return Throttle({
    default: {
      ttl: 1000, // Time to live in seconds
      limit: 3, // Maximum number of requests within the ttl
    },
  });
};

// Moderate throttle: 10 requests per 1000 seconds
export const ModerateThrottle = () => {
  return Throttle({
    default: {
      ttl: 1000, // Time to live in seconds
      limit: 10, // Maximum number of requests within the ttl
    },
  });
};

// Lenient throttle: 20 requests per 1000 seconds
export const LenientThrottle = () => {
  return Throttle({
    default: {
      ttl: 1000, // Time to live in seconds
      limit: 20, // Maximum number of requests within the ttl
    },
  });
};
