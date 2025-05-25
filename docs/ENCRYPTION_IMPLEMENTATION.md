# SecureBallot Encryption Implementation

## Overview

The SecureBallot voting system implements a hybrid encryption approach using RSA-2048 and AES-256 to ensure vote privacy and integrity. This document explains the implementation details and how to use the encryption services.

## Architecture

### Hybrid Encryption Model

The system uses a hybrid encryption approach that combines the strengths of both asymmetric and symmetric encryption:

1. **RSA-2048** for key exchange and authentication
2. **AES-256-CBC** for efficient data encryption
3. **SHA-256** for data integrity verification

### Key Components

- **Vote Encryption Service** (`src/services/voteEncryptionService.ts`)
- **Election Key Service** (`src/services/electionKeyService.ts`)
- **Encryption Utilities** (`src/utils/encryption.ts`)

## How It Works

### 1. Election Key Generation

For each election, a unique RSA-2048 key pair is generated:

```typescript
import { generateElectionKeyPair } from '../services/electionKeyService';

// Generate keys for an election
const keyRecord = await generateElectionKeyPair(electionId, adminId);
```

**Key Security:**
- Public key is stored for encryption
- Private key is split using Shamir's Secret Sharing (5 shares, threshold of 3)
- Key shares are distributed to election officials
- Public key fingerprint is stored for verification

### 2. Vote Encryption Process

When a vote is cast, the following encryption process occurs:

```typescript
import { encryptVote } from '../services/voteEncryptionService';

const voteData = {
  voterId: 'voter-123',
  electionId: 'election-456',
  candidateId: 'candidate-789',
  pollingUnitId: 'unit-101',
  timestamp: new Date(),
  voteSource: 'web'
};

const encryptedVote = encryptVote(voteData, electionPublicKey);
```

**Encryption Steps:**
1. Serialize vote data to JSON
2. Generate a unique AES-256 key for the vote
3. Encrypt vote data with AES-256-CBC
4. Encrypt the AES key with election's RSA public key
5. Generate SHA-256 hash of original vote data
6. Create public key fingerprint for verification

### 3. Vote Storage

Encrypted votes are stored in the database with the following fields:

```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  election_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  polling_unit_id UUID NOT NULL,
  encrypted_vote_data BYTEA NOT NULL,
  encrypted_aes_key TEXT NOT NULL,
  iv VARCHAR(32) NOT NULL,
  vote_hash VARCHAR(255) NOT NULL,
  public_key_fingerprint VARCHAR(16) NOT NULL,
  receipt_code VARCHAR(255) NOT NULL,
  vote_timestamp TIMESTAMP NOT NULL,
  vote_source VARCHAR(50) NOT NULL,
  is_counted BOOLEAN DEFAULT FALSE
);
```

### 4. Vote Verification

Voters receive a receipt code that allows them to verify their vote was recorded:

```typescript
import { verifyVoteIntegrity } from '../services/voteEncryptionService';

const isValid = verifyVoteIntegrity(encryptedVote, electionPublicKey);
```

### 5. Vote Counting (Decryption)

During result tallying, authorized officials reconstruct the private key and decrypt votes:

```typescript
import { reconstructPrivateKey } from '../services/electionKeyService';
import { batchDecryptVotes } from '../services/voteEncryptionService';

// Reconstruct private key from shares
const privateKey = reconstructPrivateKey(
  electionId, 
  keyShares, 
  { adminId: 'admin-123', reason: 'Result tallying' }
);

// Decrypt all votes for counting
const decryptedVotes = batchDecryptVotes(encryptedVotes, privateKey);
```

## Security Features

### 1. Vote Privacy
- Each vote uses a unique AES key
- Vote data is never stored in plaintext
- Voter identity is separated from vote choice

### 2. Vote Integrity
- SHA-256 hash prevents tampering
- Public key fingerprint ensures correct encryption
- Receipt codes allow verification without revealing vote

### 3. Key Security
- Private keys are split using Shamir's Secret Sharing
- Keys are never stored in complete form
- Key reconstruction requires multiple officials

### 4. Audit Trail
- All encryption/decryption operations are logged
- Key generation and reconstruction events are recorded
- Vote integrity verification is tracked

## API Usage Examples

### Generate Election Keys

```typescript
// Generate keys for a new election
const keyRecord = await generateElectionKeyPair(electionId, adminId);

console.log('Public Key Fingerprint:', keyRecord.publicKeyFingerprint);
```

### Cast an Encrypted Vote

```typescript
// Get election public key
const publicKey = getElectionPublicKey(electionId);

// Prepare vote data
const voteData = {
  voterId: req.user.id,
  electionId: req.params.electionId,
  candidateId: req.body.candidateId,
  pollingUnitId: req.body.pollingUnitId,
  timestamp: new Date(),
  voteSource: 'web'
};

// Encrypt and store vote
const encryptedVote = encryptVote(voteData, publicKey);
const receiptCode = createVoteProof(voteData, encryptedVote);

const vote = await Vote.create({
  userId: voteData.voterId,
  electionId: voteData.electionId,
  candidateId: voteData.candidateId,
  pollingUnitId: voteData.pollingUnitId,
  encryptedVoteData: encryptedVote.encryptedVoteData,
  encryptedAesKey: encryptedVote.encryptedAesKey,
  iv: encryptedVote.iv,
  voteHash: encryptedVote.voteHash,
  publicKeyFingerprint: encryptedVote.publicKeyFingerprint,
  receiptCode,
  voteSource: voteData.voteSource
});
```

### Verify Vote Integrity

```typescript
// Verify a vote hasn't been tampered with
const vote = await Vote.findByPk(voteId);
const publicKey = getElectionPublicKey(vote.electionId);

const encryptedVote = {
  encryptedVoteData: vote.encryptedVoteData,
  encryptedAesKey: vote.encryptedAesKey,
  iv: vote.iv,
  voteHash: vote.voteHash,
  publicKeyFingerprint: vote.publicKeyFingerprint
};

const isValid = verifyVoteIntegrity(encryptedVote, publicKey);
```

## Database Migrations

To implement the encryption system, run these migrations:

```bash
# Add encryption fields to votes table
npm run db:migrate

# The following migrations will be applied:
# - 20250125000000-add-encryption-fields-to-votes.js
# - 20250125000001-add-public-key-fingerprint-to-elections.js
```

## Testing

Comprehensive tests are available for the encryption implementation:

```bash
# Run encryption tests
npm test tests/unit/voteEncryption.test.js

# Run all tests
npm test
```

## Security Considerations

### Production Recommendations

1. **Hardware Security Modules (HSM)**
   - Use HSM for key generation and storage
   - Implement proper key ceremony procedures

2. **Shamir's Secret Sharing**
   - Use proper cryptographic library (e.g., `shamirs-secret-sharing`)
   - Implement threshold signature schemes

3. **Key Rotation**
   - Implement key rotation policies
   - Plan for key compromise scenarios

4. **Audit Logging**
   - Log all cryptographic operations
   - Implement tamper-evident logging

5. **Zero-Knowledge Proofs**
   - Consider implementing ZK-SNARKs for vote verification
   - Enable vote verification without revealing vote content

## Performance Considerations

### Optimization Strategies

1. **Batch Operations**
   - Use `batchDecryptVotes` for counting operations
   - Implement parallel processing for large elections

2. **Caching**
   - Cache public keys to avoid repeated lookups
   - Implement connection pooling for database operations

3. **Memory Management**
   - Clear sensitive data from memory after use
   - Use secure memory allocation for key operations

## Troubleshooting

### Common Issues

1. **Key Not Found**
   ```
   Error: Election keys not found or inactive
   ```
   - Ensure keys are generated before election starts
   - Check key record is active

2. **Decryption Failure**
   ```
   Error: Vote decryption failed
   ```
   - Verify private key shares are correct
   - Check vote data hasn't been corrupted

3. **Integrity Verification Failed**
   ```
   Error: Vote integrity verification failed
   ```
   - Vote data may have been tampered with
   - Check public key fingerprint matches

### Debug Mode

Enable debug logging to troubleshoot encryption issues:

```bash
DEBUG=true npm run dev
```

## Future Enhancements

### Planned Improvements

1. **Blockchain Integration**
   - Store vote hashes on blockchain for immutability
   - Implement smart contracts for vote verification

2. **Post-Quantum Cryptography**
   - Prepare for quantum-resistant encryption algorithms
   - Implement hybrid classical/post-quantum schemes

3. **Advanced Zero-Knowledge Proofs**
   - Enable voters to prove vote validity without revealing choice
   - Implement universal verifiability

4. **Homomorphic Encryption**
   - Allow vote counting without decryption
   - Enable real-time tallying while maintaining privacy 