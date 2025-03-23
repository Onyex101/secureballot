import { Request, Response } from 'express';
import { electionService, auditService } from '../../services';

/**
 * Verify and publish election results
 */
export const verifyAndPublishResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { electionId, publishLevel = 'preliminary' } = req.body;

    // Check if election exists
    const election = await electionService.getElectionById(electionId);
    if (!election) {
      res.status(404).json({
        success: false,
        message: 'Election not found',
        code: 'ELECTION_NOT_FOUND',
      });
      return;
    }

    // Check if election is completed
    if (election.status !== 'completed') {
      res.status(400).json({
        success: false,
        message: 'Cannot publish results for an election that is not completed',
        code: 'ELECTION_NOT_COMPLETED',
      });
      return;
    }

    // Publish results
    const result = await electionService.publishElectionResults(
      electionId,
      publishLevel as 'preliminary' | 'final',
    );

    // Log the action
    await auditService.createAuditLog(
      (req as any).user.id,
      'result_verification',
      req.ip || '',
      req.headers['user-agent'] || '',
      {
        electionId: election.id,
        electionName: election.electionName,
        publishLevel,
      },
    );

    res.status(200).json({
      success: true,
      message: `Election results verified and published as ${publishLevel}`,
      data: result,
    });
  } catch (error) {
    console.error('Error verifying election results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify election results',
      error: (error as Error).message,
    });
  }
};
