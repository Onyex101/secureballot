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

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/auth/register` | Register a new voter | No |
| POST | `/auth/login` | Authenticate a voter | No |
| POST | `/auth/verify-mfa` | Complete MFA verification | No |
| POST | `/auth/refresh-token` | Refresh authentication token | No |
| POST | `/auth/logout` | Log out and invalidate token | Yes |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |

### Voter Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/voter/profile` | Get voter profile | Yes |
| PUT | `/voter/profile` | Update voter profile | Yes |
| PUT | `/voter/change-password` | Change voter password | Yes |
| GET | `/voter/polling-unit` | Get voter's assigned polling unit | Yes |
| GET | `/voter/verification-status` | Get voter verification status | Yes |
| GET | `/voter/eligibility/:electionId` | Check voter eligibility for an election | Yes |
| GET | `/voter/vote-history` | Get voter's vote history | Yes |
| GET | `/voter/verify-vote/:receiptCode` | Verify a vote receipt | Yes |
| POST | `/voter/report-vote-issue` | Report an issue with a vote | Yes |

### Election Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/elections` | Get list of elections | Yes |
| GET | `/elections/:electionId` | Get election details | Yes |
| GET | `/elections/:electionId/candidates` | Get candidates for an election | Yes |
| GET | `/elections/:electionId/candidates/:candidateId` | Get candidate details | Yes |
| GET | `/elections/:electionId/voting-status` | Check voter's voting status for an election | Yes |
| GET | `/elections/:electionId/offline-package` | Generate offline voting package | Yes |
| POST | `/elections/:electionId/submit-offline` | Submit offline votes | Yes |
| GET | `/elections/:electionId/offline-votes/:receiptCode` | Verify offline vote status | Yes |

#### Election Offline Voting

The election offline voting feature provides:
- Generation of secure offline voting packages with encryption keys
- Support for areas with poor connectivity or intermittent network access
- Secure submission of offline votes when connectivity is restored
- Verification of offline votes using receipt codes
- Comprehensive audit logging of all offline voting activities
- End-to-end encryption to ensure vote integrity and confidentiality

### Voting Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/elections/:electionId/vote` | Cast a vote in an election | Yes |

### Results Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/results/live/:electionId` | Get real-time election results | No |
| GET | `/results/region/:electionId` | Get election results by region | No |
| GET | `/results/statistics/:electionId` | Get comprehensive statistics for an election | No |

### USSD Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/ussd/start` | Initiate USSD voting session | No |
| POST | `/ussd/vote` | Cast vote via USSD | No |
| GET | `/ussd/session-status` | Check USSD session status | No |
| POST | `/ussd/africa-talking` | Webhook for Africa's Talking USSD service | No |
| POST | `/ussd/verify-vote` | Verify a vote via USSD | No |

### Mobile Integration Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/mobile/auth/login` | Login via mobile app with NIN, VIN, and password | No |
| POST | `/mobile/auth/verify-device` | Verify mobile device for enhanced security | Yes |
| GET | `/mobile/vote/offline-package` | Download offline voting package for areas with poor connectivity | Yes |
| POST | `/mobile/vote/submit-offline/:electionId` | Submit votes collected offline | Yes |
| GET | `/mobile/polling-units/nearby` | Find nearby polling units based on geolocation | Yes |
| POST | `/mobile/sync` | Synchronize data between mobile app and server | Yes |
| GET | `/mobile/elections/:electionId` | Get detailed election information for mobile app | Yes |
| POST | `/mobile/vote/:electionId` | Cast vote from mobile app | Yes |

#### Mobile Authentication Details

The mobile authentication flow includes:
- Login with NIN, VIN, and password
- Device information tracking for security
- Extended token validity (30 days) for mobile users
- Device verification with 6-digit code
- Enhanced security with 90-day token for verified devices

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

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|--------------|---------------|
| GET | `/admin/users` | List all system users | Yes | SystemAdmin |
| POST | `/admin/users` | Create new admin user | Yes | SystemAdmin |
| GET | `/admin/elections` | List all elections with management options | Yes | ElectoralCommissioner |
| POST | `/admin/elections` | Create a new election | Yes | ElectoralCommissioner |
| GET | `/admin/security/logs` | Get security-related logs | Yes | SecurityOfficer |
| POST | `/admin/results/publish` | Publish election results | Yes | ElectoralCommissioner, ResultVerificationOfficer |

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

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General Endpoints**: 100 requests per 15-minute window per IP
- **Authentication Endpoints**: 10 requests per hour per IP
- **USSD Endpoints**: 20 requests per hour per IP
- **Sensitive Operations**: 5 requests per hour per IP

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1605582000
```

## Security Considerations

1. **Encryption**:
   - All votes are encrypted using hybrid encryption (RSA + AES)
   - The RSA public key is provided by the server
   - Votes are encrypted on the client side before transmission

2. **Vote Verification**:
   - Each vote produces a unique receipt code
   - Voters can verify their votes using these receipt codes
   - Verification only confirms that the vote was recorded, not the specific choice

3. **Data Protection**:
   - Personal data is encrypted at rest
   - NIN and VIN are never returned in API responses
   - Session tokens have limited lifespans
   - HTTPS is enforced for all API communication

4. **Audit Trail**:
   - All critical operations are logged
   - Logs include timestamp, user ID, and IP address
   - Logs are securely stored and cannot be modified

5. **Input Validation**:
   - All inputs are strictly validated
   - Content types and lengths are enforced
   - Request and response data are sanitized

6. **Mobile Security**:
   - Device verification for enhanced security
   - Extended token validity for verified devices
   - Secure offline storage with encryption
   - Digital signatures for data integrity
   - Comprehensive audit logging of mobile activities

These security measures ensure the integrity, confidentiality, and availability of the voting process, while maintaining transparency and verifiability.
