# Nigerian E-Voting System API Structure

This document provides a comprehensive overview of the API structure for the Nigerian E-Voting System, designed to facilitate secure electronic voting through multiple channels including web, mobile, and USSD.

## Table of Contents

- [API Overview](#api-overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Voter Management Endpoints](#voter-management-endpoints)
  - [Election Endpoints](#election-endpoints)
  - [Voting Endpoints](#voting-endpoints)
  - [Results Endpoints](#results-endpoints)
  - [USSD Endpoints](#ussd-endpoints)
  - [Mobile Integration Endpoints](#mobile-integration-endpoints)
  - [Admin Endpoints](#admin-endpoints)
- [Request/Response Formats](#requestresponse-formats)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Security Considerations](#security-considerations)

## API Overview

The API follows RESTful principles and is organized into logical resource groups. It uses JSON for request and response bodies, JWT for authentication, and includes comprehensive validation and security measures.

**Current Status**: ✅ **PRODUCTION READY** - All endpoints fully implemented with military-grade encryption.

## Base URL

```
https://api.evoting.gov.ng/api/v1
```

All endpoints described in this document are relative to this base URL.

## Authentication

The API uses JWT (JSON Web Token) based authentication:

1. **Authentication Flow**:
   - User registers or logs in and receives a JWT token
   - The token is included in the `Authorization` header for subsequent requests
   - `Authorization: Bearer {token}`

2. **Multi-Factor Authentication**:
   - After initial login, MFA verification may be required
   - A verification code is sent to the user's registered phone number
   - User submits this code to complete authentication

3. **Token Refresh**:
   - Access tokens expire after a configured period (default: 1 day)
   - Refresh tokens can be used to obtain new access tokens
   - Refresh tokens have a longer lifespan (default: 7 days)

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required | Implementation Status |
|--------|----------|-------------|--------------|---------------------|
| POST | `/auth/register` | Register a new voter | No | ✅ Complete |
| POST | `/auth/login` | Authenticate a voter | No | ✅ Complete |
| POST | `/auth/verify-mfa` | Complete MFA verification | No | ✅ Complete |
| POST | `/auth/refresh-token` | Refresh authentication token | No | ✅ Complete |
| POST | `/auth/logout` | Log out and invalidate token | Yes | ✅ Complete |
| POST | `/auth/forgot-password` | Request password reset | No | ✅ Complete |
| POST | `/auth/reset-password` | Reset password with token | No | ✅ Complete |

### Voter Management Endpoints

| Method | Endpoint | Description | Auth Required | Implementation Status |
|--------|----------|-------------|--------------|---------------------|
| GET | `/voter/profile` | Get voter profile | Yes | ✅ Complete |
| PUT | `/voter/profile` | Update voter profile | Yes | ✅ Complete |
| PUT | `/voter/change-password` | Change voter password | Yes | ✅ Complete |
| GET | `/voter/polling-unit` | Get voter's assigned polling unit | Yes | ✅ Complete |
| GET | `/voter/verification-status` | Get voter verification status | Yes | ✅ Complete |
| GET | `/voter/eligibility/:electionId` | Check voter eligibility for an election | Yes | ✅ Complete |
| GET | `/voter/vote-history` | Get voter's vote history | Yes | ✅ Complete |
| GET | `/voter/verify-vote/:receiptCode` | Verify a vote receipt | Yes | ✅ Complete |
| POST | `/voter/report-vote-issue` | Report an issue with a vote | Yes | ✅ Complete |

### Election Endpoints

| Method | Endpoint | Description | Auth Required | Implementation Status |
|--------|----------|-------------|--------------|---------------------|
| GET | `/elections` | Get list of elections | Yes | ✅ Complete |
| GET | `/elections/:electionId` | Get election details | Yes | ✅ Complete |
| GET | `/elections/:electionId/candidates` | Get candidates for an election | Yes | ✅ Complete |
| GET | `/elections/:electionId/candidates/:candidateId` | Get candidate details | Yes | ✅ Complete |
| GET | `/elections/:electionId/voting-status` | Check voter's voting status for an election | Yes | ✅ Complete |
| GET | `/elections/:electionId/offline-package` | Generate offline voting package | Yes | ✅ Complete |
| POST | `/elections/:electionId/submit-offline` | Submit offline votes | Yes | ✅ Complete |
| GET | `/elections/:electionId/offline-votes/:receiptCode` | Verify offline vote status | Yes | ✅ Complete |

#### Election Offline Voting

The election offline voting feature provides:
- Generation of secure offline voting packages with encryption keys
- Support for areas with poor connectivity or intermittent network access
- Secure submission of offline votes when connectivity is restored
- Verification of offline votes using receipt codes
- Comprehensive audit logging of all offline voting activities
- End-to-end encryption to ensure vote integrity and confidentiality

### Voting Endpoints

| Method | Endpoint | Description | Auth Required | Implementation Status |
|--------|----------|-------------|--------------|---------------------|
| POST | `/elections/:electionId/vote` | Cast a vote in an election with hybrid encryption | Yes | ✅ Complete |

### Results Endpoints

| Method | Endpoint | Description | Auth Required | Implementation Status |
|--------|----------|-------------|--------------|---------------------|
| GET | `/results/live/:electionId` | Get real-time election results | No | ✅ Complete |
| GET | `/results/region/:electionId` | Get election results by region | No | ✅ Complete |
| GET | `/results/statistics/:electionId` | Get comprehensive statistics for an election | No | ✅ Complete |
| GET | `/results/realtime/:electionId` | Get real-time election updates | Yes | ✅ Complete |

### USSD Endpoints

| Method | Endpoint | Description | Auth Required | Implementation Status |
|--------|----------|-------------|--------------|---------------------|
| POST | `/ussd/session/start` | Initiate USSD voting session | No | ✅ Complete |
| POST | `/ussd/session/menu` | Handle USSD menu navigation | No | ✅ Complete |
| POST | `/ussd/session/end` | End USSD session | No | ✅ Complete |
| GET | `/ussd/session-status` | Check USSD session status | No | ✅ Complete |
| POST | `/ussd/vote` | Cast vote via USSD | No | ✅ Complete |
| POST | `/ussd/africa-talking` | Webhook for Africa's Talking USSD service | No | ✅ Complete |
| POST | `/ussd/verify-vote` | Verify a vote via USSD | No | ✅ Complete |

### Mobile Integration Endpoints

| Method | Endpoint | Description | Auth Required | Implementation Status |
|--------|----------|-------------|--------------|---------------------|
| POST | `/mobile/auth/login` | Login via mobile app with NIN, VIN, and password | No | ✅ Complete |
| POST | `/mobile/auth/request-device-verification` | Request device verification code | Yes | ✅ Complete |
| POST | `/mobile/auth/verify-device` | Verify mobile device for enhanced security | Yes | ✅ Complete |
| GET | `/mobile/vote/offline-package` | Download offline voting package for areas with poor connectivity | Yes | ✅ Complete |
| POST | `/mobile/vote/submit-offline/:electionId` | Submit votes collected offline | Yes | ✅ Complete |
| GET | `/mobile/polling-units/nearby` | Find nearby polling units based on geolocation | Yes | ✅ Complete |
| GET | `/mobile/my-polling-unit` | Get user's assigned polling unit | Yes | ✅ Complete |
| POST | `/mobile/sync` | Synchronize data between mobile app and server | Yes | ✅ Complete |
| GET | `/mobile/elections/:electionId` | Get detailed election information for mobile app | Yes | ✅ Complete |
| POST | `/mobile/vote/:electionId` | Cast vote from mobile app | Yes | ✅ Complete |

#### Mobile Authentication Details

The mobile authentication flow includes:
- Login with NIN, VIN, and password
- Device information tracking for security
- Extended token validity (30 days) for mobile users
- Device verification with crypto-secure 6-digit codes
- Enhanced security with 90-day token for verified devices
- SMS integration for verification code delivery

#### Mobile Offline Voting

The offline voting feature enables:
- Downloading election data, candidates, and encryption keys
- Secure offline vote storage with encryption
- Batch submission of votes when connectivity is restored
- Digital signatures to verify vote integrity
- Receipt codes for vote verification

#### Mobile Synchronization

The sync functionality supports:
- Selective data synchronization (elections, candidates, polling units, profile)
- Bandwidth-efficient delta updates
- Background synchronization
- Conflict resolution for offline changes

### Admin Endpoints

| Method | Endpoint | Description | Auth Required | Role Required | Implementation Status |
|--------|----------|-------------|--------------|---------------|---------------------|
| GET | `/admin/users` | List all system users | Yes | SystemAdmin | ✅ Complete |
| POST | `/admin/users` | Create new admin user | Yes | SystemAdmin | ✅ Complete |
| GET | `/admin/elections` | List all elections with management options | Yes | ElectoralCommissioner | ✅ Complete |
| POST | `/admin/elections` | Create a new election | Yes | ElectoralCommissioner | ✅ Complete |
| GET | `/admin/security/logs` | Get security-related logs | Yes | SecurityOfficer | ✅ Complete |
| POST | `/admin/results/publish` | Publish election results | Yes | ElectoralCommissioner, ResultVerificationOfficer | ✅ Complete |
| GET | `/admin/regions/:state/polling-units` | Get polling units in a region | Yes | RegionalOfficer | ✅ Complete |
| POST | `/admin/polling-units` | Create new polling unit | Yes | RegionalOfficer | ✅ Complete |
| PUT | `/admin/polling-units/:pollingUnitId` | Update polling unit | Yes | RegionalOfficer | ✅ Complete |
| GET | `/admin/regions/:state/statistics` | Get regional statistics | Yes | RegionalOfficer | ✅ Complete |

## Request/Response Formats

### Standard Request Format

```json
{
  "property1": "value1",
  "property2": "value2",
  ...
}
```

### Standard Success Response Format

```json
{
  "code": "SUCCESS_CODE",
  "message": "Human-readable success message",
  "data": {
    // Response data
  }
}
```

### Standard Pagination Response Format

```json
{
  "code": "SUCCESS_CODE",
  "message": "Human-readable success message",
  "data": {
    "items": [
      // Array of items
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "pages": 10
    }
  }
}
```

### Vote Response Format (Enhanced with Encryption Details)

```json
{
  "success": true,
  "voteId": "vote-uuid",
  "receiptCode": "16-char-verification-code",
  "voteHash": "first-16-chars-of-sha256",
  "timestamp": "2024-01-25T10:30:00Z",
  "encryption": {
    "algorithm": "RSA-2048 + AES-256-CBC",
    "keyFingerprint": "public-key-fingerprint",
    "integrity": "SHA-256"
  }
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Optional error details
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Input validation failed |
| AUTHENTICATION_REQUIRED | 401 | Authentication is required |
| INVALID_CREDENTIALS | 401 | Invalid login credentials |
| INVALID_TOKEN | 401 | Invalid or expired JWT token |
| ACCESS_DENIED | 403 | Insufficient permissions |
| RESOURCE_NOT_FOUND | 404 | Requested resource not found |
| ALREADY_EXISTS | 409 | Resource already exists |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| INTERNAL_SERVER_ERROR | 500 | Server error |

### Encryption-Specific Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| ENCRYPTION_FAILED | 500 | Vote encryption failed |
| DECRYPTION_FAILED | 500 | Vote decryption failed |
| INVALID_SIGNATURE | 400 | Digital signature verification failed |
| KEY_NOT_FOUND | 404 | Election encryption keys not found |
| INTEGRITY_CHECK_FAILED | 400 | Vote integrity verification failed |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General Endpoints**: 100 requests per 15-minute window per IP
- **Authentication Endpoints**: 10 requests per hour per IP
- **Vote Submission**: 5 requests per hour per user (prevents multiple voting)
- **USSD Endpoints**: 20 requests per hour per IP
- **Sensitive Operations**: 5 requests per hour per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1605582000
```

## Security Considerations

### 1. Encryption

**Vote Encryption:**
- All votes are encrypted using hybrid encryption (RSA-2048 + AES-256)
- Each vote uses a unique AES key for maximum security
- RSA public keys are provided by the server for each election
- Votes are encrypted on the client side before transmission

**Key Management:**
- Election keys are generated using cryptographically secure random number generators
- Private keys are split using Shamir's Secret Sharing (5 shares, 3 threshold)
- Key shares are distributed to authorized election officials
- Public key fingerprints are used for verification

### 2. Vote Verification

**Receipt System:**
- Each vote produces a unique receipt code
- Voters can verify their votes using these receipt codes
- Verification only confirms that the vote was recorded, not the specific choice
- Zero-knowledge proofs ensure vote privacy during verification

### 3. Data Protection

**Personal Data Security:**
- Personal data is encrypted at rest using AES-256
- NIN and VIN are never returned in API responses
- Session tokens have limited lifespans
- HTTPS is enforced for all API communication

**Database Security:**
- All sensitive database fields are encrypted
- Vote data is stored in encrypted format
- Database connections use SSL/TLS encryption
- Regular security audits and penetration testing

### 4. Audit Trail

**Comprehensive Logging:**
- All critical operations are logged with timestamps
- Logs include user ID, IP address, and user agent
- Cryptographic operations are specifically tracked
- Logs are securely stored and cannot be modified

**Audit Features:**
- Real-time monitoring of all voting activities
- Automated alerts for suspicious activities
- Comprehensive reporting for election oversight
- Tamper-evident logging mechanisms

### 5. Input Validation

**Security Measures:**
- All inputs are strictly validated against defined schemas
- Content types and lengths are enforced
- Request and response data are sanitized
- SQL injection prevention through parameterized queries
- XSS protection with Content Security Policy

### 6. Mobile Security

**Enhanced Mobile Features:**
- Device verification for enhanced security
- Extended token validity for verified devices
- Secure offline storage with encryption
- Digital signatures for data integrity
- Comprehensive audit logging of mobile activities
- Biometric authentication support where available

### 7. USSD Security

**USSD-Specific Security:**
- Nigerian phone number validation
- Session management with expiration
- SMS-based verification codes
- Rate limiting to prevent abuse
- Comprehensive audit logging

### 8. Network Security

**Production Requirements:**
- HTTPS/TLS 1.3 minimum for all communications
- Certificate pinning for mobile applications
- DDoS protection and load balancing
- IP-based rate limiting and blocking
- Geographic access controls where appropriate

These security measures ensure the integrity, confidentiality, and availability of the voting process, while maintaining transparency and verifiability. The system is designed to meet international standards for electronic voting security and Nigerian electoral requirements.
