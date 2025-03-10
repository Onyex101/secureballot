import { Request, Response } from 'express';
import { electionService, auditService } from '../../services';

/**
 * Create a new election
 */
export const createElection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { electionName, electionType, startDate, endDate, description, eligibilityRules } = req.body;
    
    // Validate that end date is after start date
    if (new Date(endDate) <= new Date(startDate)) {
      res.status(400).json({
        success: false,
        message: 'End date must be after start date',
        code: 'INVALID_DATE_RANGE'
      });
      return;
    }
    
    // Check for overlapping elections of the same type
    const hasOverlap = await electionService.checkOverlappingElections(
      electionType,
      startDate,
      endDate
    );
    
    if (hasOverlap) {
      res.status(409).json({
        success: false,
        message: 'An election of this type already exists within the specified date range',
        code: 'ELECTION_OVERLAP'
      });
      return;
    }
    
    // Create new election
    const newElection = await electionService.createElection(
      electionName,
      electionType,
      startDate,
      endDate,
      (req as any).user.id,
      description,
      eligibilityRules
    );
    
    // Log the action
    await auditService.createAuditLog(
      (req as any).user.id,
      'election_creation',
      req.ip || '',
      req.headers['user-agent'] || '',
      { 
        electionId: newElection.id,
        electionName: newElection.electionName,
        electionType: newElection.electionType
      }
    );
    
    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: newElection
    });
  } catch (error) {
    console.error('Error creating election:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create election',
      error: (error as Error).message
    });
  }
};

/**
 * Publish election results
 */
export const publishResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { electionId, publishLevel = 'preliminary' } = req.body;
    
    // Check if election exists
    const election = await electionService.getElectionById(electionId);
    if (!election) {
      res.status(404).json({
        success: false,
        message: 'Election not found',
        code: 'ELECTION_NOT_FOUND'
      });
      return;
    }
    
    // Check if election is completed
    if (election.status !== 'completed') {
      res.status(400).json({
        success: false,
        message: 'Cannot publish results for an election that is not completed',
        code: 'ELECTION_NOT_COMPLETED'
      });
      return;
    }
    
    // Publish results
    const result = await electionService.publishElectionResults(
      electionId,
      publishLevel as 'preliminary' | 'final'
    );
    
    // Log the action
    await auditService.createAuditLog(
      (req as any).user.id,
      'result_publication',
      req.ip || '',
      req.headers['user-agent'] || '',
      { 
        electionId: election.id,
        electionName: election.electionName,
        publishLevel
      }
    );
    
    res.status(200).json({
      success: true,
      message: `Election results published as ${publishLevel}`,
      data: result
    });
  } catch (error) {
    console.error('Error publishing election results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish election results',
      error: (error as Error).message
    });
  }
};
