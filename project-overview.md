# Nigerian E-Voting System

A secure, scalable, and inclusive electronic voting system designed for Nigerian elections with support for both web-based and USSD voting channels.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [API Structure](#api-structure)
- [Security Features](#security-features)
- [User Roles](#user-roles)
- [Mobile Integration](#mobile-integration)
- [USSD Integration](#ussd-integration)
- [Implementation Considerations](#implementation-considerations)

## Overview

This electronic voting system is designed to address the specific challenges of the Nigerian electoral process while ensuring security, accessibility, and transparency. The system supports multiple voting channels including web, mobile applications, and USSD for citizens without smartphones.

### Key Features

- **Multi-channel voting**: Web interface, mobile app, and USSD support
- **Multi-factor authentication**: Using National Identification Number (NIN), Voter Identification Number (VIN), and phone verification
- **Hybrid encryption**: Secure vote storage using asymmetric and symmetric encryption
- **Real-time monitoring**: Live election statistics and results visualization
- **Role-based access control**: Granular permissions for various electoral officials
- **Comprehensive audit trail**: Logging of all system activities for transparency
- **Offline support**: Mobile app features for areas with poor connectivity
- **Observer integration**: Support for domestic and international election observers

## System Architecture

The system is built using a modern, secure architecture:

- **Backend**: RESTful API built with secure coding practices
- **Database**: PostgreSQL relational database with encryption support
- **Authentication**: JWT-based authentication with MFA support
- **Encryption Layer**: RSA + AES hybrid encryption for vote data
- **Mobile App**: Native mobile application with offline capabilities
- **USSD Gateway**: Integration with Africa's Talking USSD service

## Database Design

The PostgreSQL database is structured to ensure security, scalability, and data integrity.

### Core Tables

#### Voter Management
- **voters**: Stores voter authentication information with system-generated UUID as primary key
- **voter_cards**: Contains voter registration details and polling unit assignments
- **verification_status**: Tracks the verification state of each voter

#### Election Management
- **elections**: Details about each election (name, type, dates, status)
- **candidates**: Information about candidates and their party affiliations
- **votes**: Securely stores encrypted votes with vote hash for verification
- **election_stats**: Pre-calculated statistics for dashboard performance

#### Geographic Data
- **polling_units**: Information about polling locations with hierarchical geographic data
- **regions**: Hierarchical structure of states, LGAs, and wards

#### Security and Audit
- **audit_logs**: Comprehensive logging of all system activities
- **failed_attempts**: Monitoring login failures and security threats
- **security_logs**: Records security incidents and their resolution

#### USSD Integration
- **ussd_sessions**: Manages temporary session codes for USSD voting
- **ussd_votes**: Records votes cast through USSD

#### Admin Management
- **admin_users**: Information about system administrators and officials
- **admin_roles**: Role assignments for admin users
- **admin_permissions**: Granular permissions for system access
- **admin_logs**: Audit trail of admin activities

#### Notifications and Support
- **notifications**: System notifications for voters and admins
- **notification_templates**: Templates for various notification types
- **observer_reports**: Reports submitted by election observers

#### Encryption and Key Management
- **key_ceremonies**: Records of key generation ceremonies
- **key_shares**: Securely stores key shares for authorized officials

### Database Schema Diagram

The E-Voting System uses a normalized database schema with appropriate relationships and constraints to maintain data integrity and security.

### Data Security Measures

- Encryption of sensitive data columns
- Use of UUID instead of sequential IDs for primary keys
- Strict foreign key constraints
- Regular database backups with encryption

## API Structure

The API follows RESTful principles with clear endpoint organization.

### Authentication & User Management

- **POST /auth/register**: Register a new voter
- **POST /auth/login**: Authenticate a user
- **POST /auth/verify-mfa**: Complete MFA verification
- **POST /auth/refresh-token**: Refresh authentication token
- **POST /auth/logout**: Log out user and invalidate token

### Voter Operations

- **POST /voter/verify**: Verify voter eligibility
- **GET /voter/profile**: Get voter profile information
- **GET /voter/polling-unit**: Get voter's assigned polling unit details

### Election & Voting

- **GET /elections**: Get list of all elections
- **GET /elections/{electionId}**: Get details for a specific election
- **GET /elections/{electionId}/candidates**: Get list of candidates
- **POST /elections/{electionId}/vote**: Cast a vote in an election
- **GET /elections/{electionId}/voting-status**: Check if voter has already voted

### Results & Monitoring

- **GET /results/live/{electionId}**: Get real-time election results
- **GET /results/statistics/{electionId}**: Get comprehensive statistics

### USSD Integration

- **POST /ussd/start**: Initiate USSD voting session
- **POST /ussd/vote**: Cast vote via USSD
- **GET /ussd/session-status**: Check USSD session status

### Mobile-Specific Endpoints

- **POST /mobile/auth/login**: Login via mobile app
- **POST /mobile/vote/offline-package**: Download offline voting package
- **POST /mobile/vote/submit-offline**: Submit votes collected offline
- **GET /mobile/polling-units/nearby**: Find nearby polling units
- **POST /mobile/voter/biometric-capture**: Submit voter biometric data

### Admin Dashboard APIs

The system includes extensive admin APIs organized by role:

#### System Administrator
- User management endpoints
- System settings and configuration
- Backup and restore functionality

#### Electoral Commissioner
- Election creation and management
- Candidate registration
- Result publishing and verification

#### Regional Officer
- Polling unit management
- Region-specific voter statistics
- Regional election monitoring

#### Security Officer
- Security log monitoring
- Threat management
- Key ceremony coordination

#### Result Verification Officer
- Results verification and audit
- Vote counting oversight
- Statistical analysis

#### Observer APIs
- Observer registration and accreditation
- Incident reporting
- Results monitoring

## Security Features

### Hybrid Encryption System

The system uses a hybrid encryption approach:

1. **Election Key Generation**:
   - For each election, a unique RSA key pair is generated
   - The public key is published and accessible to all voters
   - The private key is split using Shamir's Secret Sharing
   - Multiple election officials hold key shares

2. **Vote Encryption Process**:
   - Voter selects their candidate
   - A temporary AES-256 symmetric key is generated for the session
   - The vote is encrypted using this symmetric key
   - The symmetric key itself is encrypted using the election's public RSA key
   - Both encrypted components are stored separately

3. **Vote Decryption Process**:
   - When counting begins, officials provide their key shares
   - The election's private key is reconstructed
   - This key decrypts the AES keys, which then decrypt the votes
   - Decryption happens in a secure environment

### Additional Security Measures

- **Zero-Knowledge Proofs**: Voters can verify their vote without revealing choices
- **Vote Verification**: Cryptographic receipts with unique identifiers
- **Anti-Tampering**: Blockchain-inspired immutable audit logs
- **Key Security**: Hardware security modules for key generation
- **Forward Secrecy**: Session keys are never reused and destroyed after encryption
- **Quantum Resistance**: Extended key lengths to provide margin against quantum attacks

## User Roles

The system supports multiple user roles with appropriate permissions:

### Administrative Roles

1. **System Administrator**:
   - Overall system management
   - User account administration
   - System configuration and security settings

2. **Electoral Commissioner**:
   - Election creation and oversight
   - Final result certification
   - Electoral policy enforcement

3. **IT Security Officer**:
   - Security monitoring and incident response
   - Encryption key management
   - System penetration testing and security audits

4. **System Auditor**:
   - Comprehensive audit trail monitoring
   - Report generation
   - Compliance verification

5. **Regional Electoral Officer**:
   - Managing specific geographic regions
   - Polling unit administration
   - Regional result verification

6. **Election Manager**:
   - Day-to-day election operations
   - Scheduling and timeline management
   - Resource allocation

7. **Polling Unit Officer**:
   - On-site management of polling stations
   - Voter assistance
   - First-level verification

8. **Voter Registration Officer**:
   - Processing verification requests
   - Managing voter records
   - Resolving registration issues

9. **Result Verification Officer**:
   - Vote counting oversight
   - Result verification
   - Anomaly detection

10. **Candidate Registration Officer**:
    - Processing candidate nominations
    - Party affiliation verification
    - Candidate information management

### End-User Roles

1. **Registered Voter**:
   - Account management
   - Voting in eligible elections
   - Viewing public election information

2. **Observer/Monitor**:
   - Election process monitoring
   - Incident reporting
   - Result verification

## Mobile Integration

The system includes a comprehensive mobile application with features for all connectivity scenarios:

### Key Mobile Features

- **Online & Offline Voting**: Support for areas with poor connectivity
- **Biometric Authentication**: Fingerprint and facial recognition where available
- **Document Upload**: Submit verification documents directly from the app
- **Geolocation**: Find nearby polling units based on current location
- **Push Notifications**: Real-time updates on elections and verification status
- **Multilingual Support**: Interface in multiple Nigerian languages
- **Accessibility**: Compliance with mobile accessibility standards

### Offline Mode Capabilities

- **Offline Package Download**: Pre-download election data when connectivity is available
- **Secure Storage**: Encrypted local storage of credentials and voting data
- **Delayed Submission**: Queue votes for submission when connectivity returns
- **Cryptographic Verification**: Local verification of vote integrity
- **Sync Mechanism**: Intelligent data synchronization to minimize bandwidth usage

## USSD Integration

For voters without smartphones, the system offers a comprehensive USSD interface:

### USSD Voting Flow

1. User dials designated USSD code (e.g., *123#)
2. Authentication via NIN and VIN
3. OTP sent to registered phone number
4. Upon verification, available elections are displayed
5. User selects election and candidate
6. Confirmation message displayed
7. Vote encrypted and stored in same format as web/mobile votes
8. Confirmation SMS sent with verification code

### USSD Security Features

- **Session Management**: Temporary session codes with expiration
- **SMS Verification**: OTP confirmation for authentication
- **Rate Limiting**: Protection against automated attempts
- **Simplified Interface**: Clear instructions and minimal steps
- **Consistent Data Model**: Same backend data structure for all voting channels

## Implementation Considerations

### Technology Stack Recommendations

- **Backend Framework**: Node.js with Express or NestJS
- **Database**: PostgreSQL with encryption extensions
- **Authentication**: JWT + OAuth 2.0 + custom MFA
- **Encryption**: Node.js crypto library with HSM integration
- **API Documentation**: OpenAPI/Swagger
- **Testing**: Jest for unit tests, Artillery for load testing
- **CI/CD**: GitHub Actions or Jenkins
- **Monitoring**: Prometheus and Grafana

### Deployment Strategy

- **Infrastructure**: Kubernetes-orchestrated containers
- **Scaling**: Horizontal scaling for API and database
- **Load Balancing**: Multiple API instances with geographic distribution
- **CDN**: Static assets distributed via CDN
- **Database**: Primary-replica configuration with read replicas
- **Backups**: Automated, encrypted backups with off-site storage
- **DR Plan**: Comprehensive disaster recovery procedures

### Security Implementations

- **API Security**: Rate limiting, IP filtering, request validation
- **Data Protection**: Encryption at rest and in transit
- **Key Management**: HashiCorp Vault for secrets
- **Penetration Testing**: Regular security audits with OWASP methodology
- **Compliance**: Adherence to Nigerian data protection regulations

### Performance Considerations

- **Database Optimization**: Proper indexing and query optimization
- **Caching Strategy**: Redis for frequent queries
- **Connection Pooling**: Efficient database connection management
- **Load Testing**: Simulation of election-day traffic patterns
- **Monitoring**: Real-time system health and performance metrics
