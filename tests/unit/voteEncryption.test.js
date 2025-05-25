const {
  generateElectionKeys,
  encryptVote,
  decryptVote,
  verifyVoteIntegrity,
  createVoteProof,
  batchDecryptVotes,
} = require('../../src/services/voteEncryptionService');

describe('Vote Encryption Service', () => {
  let electionKeys;
  let sampleVoteData;

  beforeEach(() => {
    // Generate keys for testing
    electionKeys = generateElectionKeys();
    
    // Sample vote data
    sampleVoteData = {
      voterId: 'voter-123',
      electionId: 'election-456',
      candidateId: 'candidate-789',
      pollingUnitId: 'unit-101',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      voteSource: 'web',
    };
  });

  describe('Election Key Generation', () => {
    test('should generate valid RSA key pair', () => {
      expect(electionKeys).toHaveProperty('publicKey');
      expect(electionKeys).toHaveProperty('privateKey');
      expect(electionKeys).toHaveProperty('publicKeyFingerprint');
      
      // Check key format
      expect(electionKeys.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
      expect(electionKeys.privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----/);
      expect(electionKeys.publicKeyFingerprint).toHaveLength(16);
    });

    test('should generate unique keys for each call', () => {
      const keys1 = generateElectionKeys();
      const keys2 = generateElectionKeys();
      
      expect(keys1.publicKey).not.toBe(keys2.publicKey);
      expect(keys1.privateKey).not.toBe(keys2.privateKey);
      expect(keys1.publicKeyFingerprint).not.toBe(keys2.publicKeyFingerprint);
    });
  });

  describe('Vote Encryption', () => {
    test('should encrypt vote data successfully', () => {
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      
      expect(encryptedVote).toHaveProperty('encryptedVoteData');
      expect(encryptedVote).toHaveProperty('encryptedAesKey');
      expect(encryptedVote).toHaveProperty('iv');
      expect(encryptedVote).toHaveProperty('voteHash');
      expect(encryptedVote).toHaveProperty('publicKeyFingerprint');
      
      // Check that data is actually encrypted (not readable)
      expect(encryptedVote.encryptedVoteData).toBeInstanceOf(Buffer);
      expect(encryptedVote.encryptedVoteData.length).toBeGreaterThan(0);
      expect(encryptedVote.iv).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(encryptedVote.voteHash).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    test('should generate different encrypted data for same vote with different timestamps', () => {
      const vote1 = { ...sampleVoteData, timestamp: new Date('2024-01-15T10:30:00Z') };
      const vote2 = { ...sampleVoteData, timestamp: new Date('2024-01-15T10:30:01Z') };
      
      const encrypted1 = encryptVote(vote1, electionKeys.publicKey);
      const encrypted2 = encryptVote(vote2, electionKeys.publicKey);
      
      expect(encrypted1.encryptedVoteData).not.toEqual(encrypted2.encryptedVoteData);
      expect(encrypted1.voteHash).not.toBe(encrypted2.voteHash);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    test('should include correct public key fingerprint', () => {
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      expect(encryptedVote.publicKeyFingerprint).toBe(electionKeys.publicKeyFingerprint);
    });
  });

  describe('Vote Decryption', () => {
    test('should decrypt vote data correctly', () => {
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      const decryptedVote = decryptVote(encryptedVote, electionKeys.privateKey);
      
      expect(decryptedVote).toEqual(sampleVoteData);
    });

    test('should fail with wrong private key', () => {
      const wrongKeys = generateElectionKeys();
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      
      expect(() => {
        decryptVote(encryptedVote, wrongKeys.privateKey);
      }).toThrow();
    });

    test('should fail with tampered encrypted data', () => {
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      
      // Tamper with the encrypted data
      encryptedVote.encryptedVoteData = Buffer.from('tampered data');
      
      expect(() => {
        decryptVote(encryptedVote, electionKeys.privateKey);
      }).toThrow();
    });

    test('should fail with tampered vote hash', () => {
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      
      // Tamper with the vote hash
      encryptedVote.voteHash = 'tampered_hash';
      
      expect(() => {
        decryptVote(encryptedVote, electionKeys.privateKey);
      }).toThrow('Vote integrity verification failed');
    });
  });

  describe('Vote Integrity Verification', () => {
    test('should verify integrity of valid encrypted vote', () => {
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      const isValid = verifyVoteIntegrity(encryptedVote, electionKeys.publicKey);
      
      expect(isValid).toBe(true);
    });

    test('should fail verification with wrong public key', () => {
      const wrongKeys = generateElectionKeys();
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      const isValid = verifyVoteIntegrity(encryptedVote, wrongKeys.publicKey);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Vote Proof Generation', () => {
    test('should generate valid vote proof', () => {
      const encryptedVote = encryptVote(sampleVoteData, electionKeys.publicKey);
      const proof = createVoteProof(sampleVoteData, encryptedVote);
      
      expect(proof).toBeDefined();
      expect(typeof proof).toBe('string');
      expect(proof).toHaveLength(16);
      expect(proof).toMatch(/^[A-F0-9]+$/); // Uppercase hex
    });

    test('should generate different proofs for different votes', () => {
      const vote1 = { ...sampleVoteData, candidateId: 'candidate-1' };
      const vote2 = { ...sampleVoteData, candidateId: 'candidate-2' };
      
      const encrypted1 = encryptVote(vote1, electionKeys.publicKey);
      const encrypted2 = encryptVote(vote2, electionKeys.publicKey);
      
      const proof1 = createVoteProof(vote1, encrypted1);
      const proof2 = createVoteProof(vote2, encrypted2);
      
      expect(proof1).not.toBe(proof2);
    });
  });

  describe('Batch Decryption', () => {
    test('should decrypt multiple votes correctly', () => {
      const votes = [
        { ...sampleVoteData, candidateId: 'candidate-1' },
        { ...sampleVoteData, candidateId: 'candidate-2' },
        { ...sampleVoteData, candidateId: 'candidate-3' },
      ];
      
      const encryptedVotes = votes.map(vote => encryptVote(vote, electionKeys.publicKey));
      const decryptedVotes = batchDecryptVotes(encryptedVotes, electionKeys.privateKey);
      
      expect(decryptedVotes).toHaveLength(3);
      expect(decryptedVotes[0].candidateId).toBe('candidate-1');
      expect(decryptedVotes[1].candidateId).toBe('candidate-2');
      expect(decryptedVotes[2].candidateId).toBe('candidate-3');
    });

    test('should handle partial failures in batch decryption', () => {
      const votes = [
        { ...sampleVoteData, candidateId: 'candidate-1' },
        { ...sampleVoteData, candidateId: 'candidate-2' },
      ];
      
      const encryptedVotes = votes.map(vote => encryptVote(vote, electionKeys.publicKey));
      
      // Tamper with one vote
      encryptedVotes[1].encryptedVoteData = Buffer.from('tampered');
      
      const decryptedVotes = batchDecryptVotes(encryptedVotes, electionKeys.privateKey);
      
      // Should return only the successfully decrypted vote
      expect(decryptedVotes).toHaveLength(1);
      expect(decryptedVotes[0].candidateId).toBe('candidate-1');
    });

    test('should handle empty batch', () => {
      const decryptedVotes = batchDecryptVotes([], electionKeys.privateKey);
      expect(decryptedVotes).toHaveLength(0);
    });
  });

  describe('End-to-End Encryption Flow', () => {
    test('should complete full encryption/decryption cycle', () => {
      // 1. Generate election keys
      const keys = generateElectionKeys();
      
      // 2. Encrypt vote
      const encrypted = encryptVote(sampleVoteData, keys.publicKey);
      
      // 3. Verify integrity
      const isValid = verifyVoteIntegrity(encrypted, keys.publicKey);
      expect(isValid).toBe(true);
      
      // 4. Generate proof
      const proof = createVoteProof(sampleVoteData, encrypted);
      expect(proof).toBeDefined();
      
      // 5. Decrypt vote
      const decrypted = decryptVote(encrypted, keys.privateKey);
      expect(decrypted).toEqual(sampleVoteData);
    });
  });
}); 