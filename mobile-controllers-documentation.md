# Mobile Controllers Documentation

This document provides detailed information about the mobile controllers implemented in the Nigerian E-Voting System. These controllers enable secure mobile voting, offline capabilities, and enhanced user experience for voters using the mobile application.

## Table of Contents

- [Authentication Controllers](#authentication-controllers)
- [Vote Controllers](#vote-controllers)
- [Polling Unit Controllers](#polling-unit-controllers)
- [Sync Controllers](#sync-controllers)
- [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)

## Authentication Controllers

### Mobile Login

**Endpoint:** `POST /api/v1/mobile/auth/login`

**Controller:** `mobileAuthController.mobileLogin`

**Description:** Authenticates a voter via the mobile app using NIN, VIN, and password. Captures device information for security tracking.

**Request Parameters:**
```json
{
  "nin": "12345678901",
  "vin": "1234567890123456789",
  "password": "securePassword123",
  "deviceInfo": {
    "deviceId": "unique-device-identifier",
    "deviceModel": "iPhone 13",
    "osVersion": "iOS 16.5",
    "appVersion": "1.2.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 2592000, // 30 days in seconds
    "voter": {
      "id": "voter-uuid",
      "fullName": "John Doe",
      "pollingUnit": "PU12345",
      "isVerified": true
    },
    "requiresDeviceVerification": true
  }
}
```

**Error Responses:**
- 400: Invalid input parameters
- 401: Invalid credentials
- 403: Account locked or requires verification

**Notes:**
- Tokens for mobile users have an extended validity of 30 days
- Device verification may be required for enhanced security
- All login attempts are logged for security auditing

### Verify Device

**Endpoint:** `POST /api/v1/mobile/auth/verify-device`

**Controller:** `mobileAuthController.verifyDevice`

**Description:** Verifies a mobile device using a verification code, enhancing security for mobile users.

**Request Parameters:**
```json
{
  "deviceId": "unique-device-identifier",
  "verificationCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device verified successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 7776000, // 90 days in seconds
    "deviceVerified": true
  }
}
```

**Error Responses:**
- 400: Invalid verification code
- 401: Authentication required
- 403: Maximum verification attempts exceeded

**Notes:**
- Verified devices receive a token with 90-day validity
- Verification attempts are limited to prevent brute force attacks
- All verification attempts are logged

## Vote Controllers

### Get Offline Package

**Endpoint:** `GET /api/v1/mobile/vote/offline-package`

**Controller:** `mobileVoteController.getOfflinePackage`

**Description:** Downloads an offline voting package for areas with poor connectivity, including election data, candidates, and encryption keys.

**Query Parameters:**
- `electionId`: UUID of the election

**Response:**
```json
{
  "success": true,
  "message": "Offline voting package downloaded successfully",
  "data": {
    "election": {
      "id": "election-uuid",
      "name": "Presidential Election 2023",
      "type": "presidential",
      "startDate": "2023-02-25T08:00:00Z",
      "endDate": "2023-02-25T18:00:00Z"
    },
    "candidates": [
      {
        "id": "candidate-uuid-1",
        "name": "Candidate Name",
        "party": "Party Abbreviation",
        "position": "President"
      }
    ],
    "voter": {
      "id": "voter-uuid",
      "pollingUnit": "PU12345"
    },
    "encryption": {
      "publicKey": "PUBLIC_KEY_STRING",
      "keyId": "offline-key-1",
      "algorithm": "RSA-OAEP",
      "expiresAt": "2023-02-26T08:00:00Z"
    },
    "timestamp": "2023-02-24T10:15:30Z",
    "expiresAt": "2023-02-25T10:15:30Z"
  }
}
```

**Error Responses:**
- 400: Invalid election ID or offline package generation error
- 401: Authentication required
- 403: Voter not eligible for this election
- 404: Election not found

**Notes:**
- Packages expire after 24 hours for security
- Includes encryption keys for secure offline voting
- All package downloads are logged

### Submit Offline Votes

**Endpoint:** `POST /api/v1/mobile/vote/submit-offline/:electionId`

**Controller:** `mobileVoteController.submitOfflineVotes`

**Description:** Submits votes collected offline when connectivity is restored.

**Path Parameters:**
- `electionId`: UUID of the election

**Request Parameters:**
```json
{
  "encryptedVotes": [
    {
      "candidateId": "candidate-uuid-1",
      "encryptedVote": "ENCRYPTED_VOTE_DATA"
    }
  ],
  "signature": "DIGITAL_SIGNATURE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offline votes submitted successfully",
  "data": {
    "processedVotes": [
      {
        "id": "vote-uuid",
        "status": "processed"
      }
    ],
    "timestamp": "2023-02-25T15:30:45Z"
  }
}
```

**Error Responses:**
- 400: Invalid input or submission error
- 401: Authentication required
- 403: Insufficient permissions
- 404: Election not found

**Notes:**
- Digital signatures verify vote integrity
- Votes are processed according to the same rules as online votes
- All submissions are logged for audit purposes

### Cast Vote

**Endpoint:** `POST /api/v1/mobile/vote/:electionId`

**Controller:** `mobileSyncController.castVote`

**Description:** Casts a vote from the mobile app.

**Path Parameters:**
- `electionId`: UUID of the election

**Request Parameters:**
```json
{
  "candidateId": "candidate-uuid-1",
  "encryptedVote": "ENCRYPTED_VOTE_DATA",
  "signature": "DIGITAL_SIGNATURE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vote cast successfully",
  "data": {
    "voteId": "vote-uuid",
    "receiptCode": "ABCD1234EFGH5678",
    "timestamp": "2023-02-25T10:30:15Z"
  }
}
```

**Error Responses:**
- 400: Invalid input or vote casting error
- 401: Authentication required
- 403: Voter not eligible or has already voted
- 404: Election or candidate not found

**Notes:**
- Votes are encrypted for security
- Digital signatures verify vote integrity
- Receipt codes enable vote verification
- All votes are logged (without revealing the choice)

## Polling Unit Controllers

### Get Nearby Polling Units

**Endpoint:** `GET /api/v1/mobile/polling-units/nearby`

**Controller:** `mobilePollingUnitController.getNearbyPollingUnits`

**Description:** Finds polling units near the voter's location based on geolocation coordinates.

**Query Parameters:**
- `latitude`: Voter's latitude (required)
- `longitude`: Voter's longitude (required)
- `radius`: Search radius in kilometers (default: 5)
- `limit`: Maximum number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "pollingUnits": [
      {
        "id": "pu-uuid-1",
        "name": "Ward 1 Polling Unit 5",
        "code": "PU12345",
        "address": "123 Main Street, Lagos",
        "latitude": 6.5244,
        "longitude": 3.3792,
        "distance": 1.2 // Distance in kilometers
      }
    ],
    "searchParams": {
      "latitude": 6.5244,
      "longitude": 3.3792,
      "radius": 5,
      "limit": 10
    }
  }
}
```

**Error Responses:**
- 400: Missing coordinates or invalid parameters
- 401: Authentication required

**Notes:**
- Results are sorted by distance from the provided coordinates
- Search is limited to the specified radius
- All searches are logged for audit purposes

## Sync Controllers

### Sync Data

**Endpoint:** `POST /api/v1/mobile/sync`

**Controller:** `mobileSyncController.syncData`

**Description:** Synchronizes data between the mobile app and server, supporting selective synchronization of different data types.

**Request Parameters:**
```json
{
  "type": "elections", // One of: elections, candidates, pollingUnits, profile
  "data": {
    // Optional type-specific parameters
    "electionId": "election-uuid", // Required for candidates sync
    "regionId": "region-uuid" // Required for pollingUnits sync
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data synchronized successfully for type: elections",
  "data": {
    "elections": [
      {
        "id": "election-uuid",
        "name": "Presidential Election 2023",
        "type": "presidential",
        "startDate": "2023-02-25T08:00:00Z",
        "endDate": "2023-02-25T18:00:00Z",
        "status": "active"
      }
    ],
    "lastSyncTimestamp": "2023-02-24T10:15:30Z"
  }
}
```

**Error Responses:**
- 400: Invalid sync type or missing required parameters
- 401: Authentication required

**Notes:**
- Different data types require different parameters
- Timestamps enable efficient delta updates
- All sync operations are logged

### Get Election Details

**Endpoint:** `GET /api/v1/mobile/elections/:electionId`

**Controller:** `mobileSyncController.getElectionDetails`

**Description:** Retrieves detailed information about an election for the mobile app.

**Path Parameters:**
- `electionId`: UUID of the election

**Response:**
```json
{
  "success": true,
  "data": {
    "election": {
      "id": "election-uuid",
      "name": "Presidential Election 2023",
      "type": "presidential",
      "startDate": "2023-02-25T08:00:00Z",
      "endDate": "2023-02-25T18:00:00Z",
      "status": "active",
      "description": "2023 Nigerian Presidential Election"
    },
    "candidates": [
      {
        "id": "candidate-uuid-1",
        "name": "Candidate Name",
        "party": "Party Abbreviation",
        "position": "President",
        "photoUrl": "https://example.com/photos/candidate1.jpg"
      }
    ],
    "eligibility": {
      "isEligible": true,
      "reason": null
    }
  }
}
```

**Error Responses:**
- 400: Invalid election ID
- 401: Authentication required
- 404: Election not found

**Notes:**
- Includes voter eligibility information
- Provides candidate details with photos
- All detail requests are logged

## Error Handling

All controllers follow a consistent error handling pattern:

1. **Input Validation**: Request parameters are validated using express-validator
2. **Authentication Check**: User ID is verified in authenticated routes
3. **Error Wrapping**: Errors are wrapped with appropriate status codes and error codes
4. **Operational vs. Programming Errors**: Distinction between expected operational errors and unexpected programming errors
5. **Audit Logging**: All errors are logged for security and debugging purposes

## Security Considerations

The mobile controllers implement several security measures:

1. **Device Verification**: Enhanced security through device verification
2. **Extended Token Validity**: Longer token validity for verified devices (90 days)
3. **Encryption**: All sensitive data and votes are encrypted
4. **Digital Signatures**: Verify the integrity of offline votes
5. **Audit Logging**: Comprehensive logging of all mobile activities
6. **Rate Limiting**: Protection against brute force and DoS attacks
7. **Input Validation**: Strict validation of all input parameters

These security measures ensure the integrity, confidentiality, and availability of the mobile voting process, while maintaining transparency and verifiability. 