export default {
  title: 'User groups',
  description: 'Every user belongs to exactly one user group. It decides which private groups they may use, and at what rate and prices they are billed.',
  create: 'New user group',
  editTitle: 'Edit user group {name}',
  searchPlaceholder: 'Search name or note…',
  default: 'Default',
  defaultHint: 'New users join this user group; it cannot be deleted.',
  defaultName: 'The default user group cannot be renamed.',
  note: 'Note',
  unsaved: 'Unsaved',
  publicOnly: 'Public groups only',
  customRates: '{n} own rate | {n} own rates',
  customPrices: '{n} own price | {n} own prices',
  deleteConfirm:
    'Delete the user group "{name}"? Its {n} member(s) go back to the default user group, and its grants, own rates and own prices are deleted with it. This cannot be undone.',
  created: 'Created. You can go on to set its groups and rates, and add members.',
  columns: {
    name: 'User group',
    members: 'Members',
    granted: 'Private groups it may use',
    custom: 'Own settings'
  },
  tabs: {
    basic: 'Basics',
    groups: 'Groups & rates',
    members: 'Members'
  },
  discount: {
    label: 'Discount',
    hint: 'Multiplies the default rate of every group; a group with an own rate ignores it. 1 means no discount.',
    example: 'E.g. group default {group} → actual {rate}',
    invalid: 'Enter a number above 0, up to 4 decimals; 1 for no discount.'
  },
  groups: {
    hint: 'Whether "{name}" may use each group, and at what rate. Grants and rates take effect on Save; own model prices are saved in their own dialog.',
    emptyNew: 'Save first, then set the groups and rates.',
    access: 'Access',
    public: 'Public',
    private: 'Private',
    granted: 'Granted',
    notGranted: 'Not granted',
    grant: 'Grant {group}',
    rateOf: 'Own rate in {group}',
    rate: 'Actual rate',
    source: {
      segment: 'Own rate',
      discount: 'Group default × discount',
      group: 'Group default'
    },
    inactive: 'Not granted, not in effect',
    prices: 'Own model prices',
    priceCount: '{n} price | {n} prices',
    setPrices: 'Set',
    invalidRate: 'The own rate in {group} is not a valid number; fix it first.'
  },
  prices: {
    title: 'Own model prices of "{segment}" in {group}',
    hint: 'These are list prices; paid = list price × rate (now {rate}). They are saved in this dialog, apart from the user group.',
    readonlyHint: 'Paid = list price × rate (now {rate}).'
  },
  members: {
    notice: 'Adding and removing members takes effect at once, apart from Save below.',
    emptyNew: 'Save first, then add members.',
    add: 'Add a member',
    addHint: 'A user belongs to one user group: joining "{segment}" moves them out of the one they are in.',
    addPlaceholder: 'Search the user to add by email or name',
    search: 'Search members',
    empty: 'This user group has no members yet',
    already: '{name} is in this user group already',
    dropPersonal:
      '{name} is Personal now. Joining "{segment}" deletes their personal settings (grants, own rates, own prices); from then on they are billed as "{segment}".',
    dropPersonalConfirm: 'Join and delete personal settings',
    movedFrom: 'Moved {name} from "{from}" to "{to}"',
    remove: 'Remove',
    removeConfirm: 'Remove {name} from "{segment}"? They go back to "{to}" and are billed as "{to}" from then on.',
    movedTo: 'Moved {name} to "{to}"',
    defaultHint: 'Members of the default user group cannot be removed here: add them to the user group they should be in.'
  },
  personal: {
    summary: 'Personal · {n} user(s)',
    summaryHint: 'Users priced individually; each is a user group of their own.',
    title: 'Personal',
    description: 'Users priced individually. Each is a user group of their own, created by the system and not named.',
    pick: 'Price a user individually',
    pickHint: 'The user leaves their user group and becomes Personal; one who is Personal already opens their settings.',
    origin: 'From',
    empty: 'No user is priced individually yet',
    edit: 'Groups & pricing',
    remove: 'Move back to a user group',
    notice: 'These settings apply to this user only.',
    noticeOrigin: 'These settings apply to this user only. They were in "{origin}"; later changes to "{origin}" no longer affect them.'
  }
}
