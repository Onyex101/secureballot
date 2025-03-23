import { Request, Response } from 'express';
import { ussdService } from '../../services';
import { auditService } from '../../services';

/**
 * Cast a vote via USSD
 */
export const castVote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionCode, electionId, candidateId } = req.body;

    // Cast the vote
    const result = await ussdService.castVote(sessionCode, electionId, candidateId);

    // Log the action
    await auditService.createAuditLog(
      'ussd_system', // We don't expose the user ID for security
      'ussd_vote_cast',
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        sessionCode,
        electionId,
        // Don't log candidateId for vote secrecy
        receiptCode: result.receiptCode,
      },
    );

    res.status(200).json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        receiptCode: result.receiptCode,
        message: 'Please keep this receipt code to verify your vote later',
      },
    });
  } catch (error) {
    console.error('Error casting USSD vote:', error);

    res.status(400).json({
      success: false,
      message: (error as Error).message || 'Failed to cast vote',
      code: 'VOTE_ERROR',
    });
  }
};

/**
 * Verify a vote using receipt code
 */
export const verifyVote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { receiptCode, phoneNumber } = req.body;

    // Verify the vote
    const result = await ussdService.verifyVote(receiptCode, phoneNumber);

    // Log the action
    await auditService.createAuditLog(
      'ussd_system', // We don't expose the user ID for security
      'ussd_vote_verification',
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        phoneNumber,
        receiptCode,
        isVerified: result.isVerified,
      },
    );

    res.status(200).json({
      success: true,
      message: 'Vote verified successfully',
      data: {
        isVerified: result.isVerified,
        electionName: result.electionName,
        candidateName: result.candidateName,
        voteTimestamp: result.voteTimestamp,
      },
    });
  } catch (error) {
    console.error('Error verifying USSD vote:', error);

    res.status(400).json({
      success: false,
      message: (error as Error).message || 'Failed to verify vote',
      code: 'VERIFICATION_ERROR',
    });
  }
};
