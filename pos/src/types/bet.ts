/**
 * Represents a single bet placed by the user
 */
export interface Bet {
  /** Unique identifier for the bet */
  id: number
  /** First position selection (runner number) */
  first: number
  /** Second position selection (runner number), optional for single bets */
  second?: number
  /** Bet amount in currency units */
  amount: number
  /** Odds multiplier for potential winnings */
  odds: number
}
