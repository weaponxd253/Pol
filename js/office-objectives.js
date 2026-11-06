export function getPresidentialObjective(state) {
  switch (state.phase) {
    case 'event':
      return {
        title: state.selectedResponseId ? 'Complete Your Briefing' : 'Meet with Chief of Staff',
        description: state.selectedResponseId
          ? 'Your response has been selected. Return to the Chief of Staff briefing and continue to the policy phase.'
          : 'A new national event requires your attention. Open the Chief of Staff briefing to respond.',
        location: 'Advisor Meeting Area'
      };
    case 'policy':
      return {
        title: state.selectedPolicyId ? 'Approve Selected Policy' : 'Review National Policies',
        description: state.selectedPolicyId
          ? 'You have selected a government policy. Review its projected effects at the National Policy Desk and approve it.'
          : 'Your advisor briefing is complete. Open the National Policy Desk to review available policies.',
        location: 'National Policy Desk'
      };
    case 'report':
      return {
        title: state.outcome ? 'Review Final Cabinet Report' : 'Review Cabinet Results',
        description: state.outcome
          ? 'Your administration has reached its conclusion. Visit the Cabinet Briefing Table to review the final consequences and your presidential outcome.'
          : 'Your policy has been enacted. Visit the Cabinet Briefing Table to review the results and advance your presidency.',
        location: 'Cabinet Briefing Table'
      };
    case 'result':
      return {
        title: 'Review Presidential Legacy',
        description: 'Your presidency has concluded. Review the final results of your administration.',
        location: 'Final Results'
      };
    default:
      return {
        title: 'Presidential Duties',
        description: 'Review the current state of your administration.',
        location: 'Executive Office'
      };
  }
}
