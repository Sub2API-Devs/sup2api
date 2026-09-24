export default {
  title: 'Balance ledger',
  description: 'Every balance change of every user.',
  myTitle: 'My balance',
  myDescription: 'Your balance and its history.',
  myLedger: 'Balance history',
  balance: 'Balance',
  updatedAt: 'Updated {time}',
  negativeHint: 'Your balance is negative; new requests are rejected until it is topped up.',
  operator: 'by admin #{id}',
  cols: {
    kind: 'Type',
    delta: 'Change',
    balance: 'Balance',
    note: 'Note'
  },
  kinds: {
    usage: 'Usage',
    admin_adjust: 'Admin adjustment',
    plugin_credit: 'Plugin credit',
    plugin_debit: 'Plugin debit',
    refund: 'Refund'
  },
  adjust: {
    button: 'Adjust balance',
    title: 'Adjust balance',
    userHintSearch: 'Type an email to search, or enter a user ID',
    userHintId: 'Enter the user ID',
    userPlaceholder: 'email or ID',
    userRequired: 'Choose a user',
    target: 'User #{id}',
    direction: 'Direction',
    credit: 'Credit (add)',
    debit: 'Debit (subtract)',
    amount: 'Amount',
    amountInvalid: 'Enter a positive amount with at most 8 decimals',
    notePlaceholder: 'e.g. top-up',
    stepUpHint: 'This is a sensitive operation; you may be asked to confirm your password.',
    done: 'Balance adjusted',
    doneBalance: 'Balance adjusted, new balance {balance}',
    duplicate: 'This adjustment was already applied'
  }
}
