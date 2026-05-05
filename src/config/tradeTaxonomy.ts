// Single source of truth for all trade categories and sub-services.
// Every place that references categories — Job Creation, onboarding,
// Job Board filters, the matcher — imports from here. Adding a sub-service
// is a one-line change in the right trade block.
//
// Decisions (2026-05-04):
//   - "General Repairs" renamed "Handyman" (clearer to customers)
//   - No "Other" anywhere — explicit options only (see notes.md Section C)
//   - Snow Removal is year-round (no seasonal hide)
//   - 12 trades total (up from 7)

export interface TradeSubService {
  id: string;
  label: string;
}

export interface Trade {
  id: string;
  label: string;
  subServices: TradeSubService[];
}

export const TRADES: Trade[] = [
  {
    id: 'plumbing',
    label: 'Plumbing',
    subServices: [
      { id: 'plumbing.drain_cleaning',  label: 'Drain cleaning' },
      { id: 'plumbing.leak_repair',     label: 'Leak repair' },
      { id: 'plumbing.toilet_repair',   label: 'Toilet repair' },
      { id: 'plumbing.faucet_sink',     label: 'Faucet / sink' },
      { id: 'plumbing.water_heater',    label: 'Water heater' },
      { id: 'plumbing.new_install',     label: 'New install' },
    ],
  },
  {
    id: 'electrical',
    label: 'Electrical',
    subServices: [
      { id: 'electrical.outlet_switch',   label: 'Outlet / switch' },
      { id: 'electrical.light_fixture',   label: 'Light fixture install' },
      { id: 'electrical.ceiling_fan',     label: 'Ceiling fan' },
      { id: 'electrical.panel_work',      label: 'Panel work' },
      { id: 'electrical.ev_charger',      label: 'EV charger' },
      { id: 'electrical.troubleshooting', label: 'Troubleshooting' },
    ],
  },
  {
    id: 'hvac',
    label: 'HVAC',
    subServices: [
      { id: 'hvac.furnace_repair',   label: 'Furnace repair' },
      { id: 'hvac.ac_repair',        label: 'AC repair' },
      { id: 'hvac.maintenance',      label: 'Maintenance / tune-up' },
      { id: 'hvac.duct_cleaning',    label: 'Duct cleaning' },
      { id: 'hvac.thermostat',       label: 'Thermostat install' },
      { id: 'hvac.new_install',      label: 'New install' },
    ],
  },
  {
    id: 'handyman',
    label: 'Handyman',
    subServices: [
      { id: 'handyman.furniture_assembly', label: 'Furniture assembly' },
      { id: 'handyman.tv_mounting',        label: 'TV mounting' },
      { id: 'handyman.picture_shelf',      label: 'Picture / shelf hanging' },
      { id: 'handyman.door_repair',        label: 'Door repair' },
      { id: 'handyman.drywall_patch',      label: 'Drywall patch' },
      { id: 'handyman.caulking',           label: 'Caulking' },
      { id: 'handyman.curtain_blind',      label: 'Curtain / blind install' },
      { id: 'handyman.childproofing',      label: 'Childproofing' },
    ],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    subServices: [
      { id: 'cleaning.standard',           label: 'Standard' },
      { id: 'cleaning.deep_clean',         label: 'Deep clean' },
      { id: 'cleaning.move_in_out',        label: 'Move-in / Move-out' },
      { id: 'cleaning.post_construction',  label: 'Post-construction' },
      { id: 'cleaning.carpet',             label: 'Carpet cleaning' },
      { id: 'cleaning.window',             label: 'Window cleaning' },
      { id: 'cleaning.junk_removal',       label: 'Junk removal' },
    ],
  },
  {
    id: 'landscaping',
    label: 'Landscaping',
    subServices: [
      { id: 'landscaping.lawn_mowing',    label: 'Lawn mowing' },
      { id: 'landscaping.yard_cleanup',   label: 'Yard cleanup' },
      { id: 'landscaping.tree_shrub',     label: 'Tree / shrub trimming' },
      { id: 'landscaping.garden_design',  label: 'Garden design / planting' },
      { id: 'landscaping.mulching',       label: 'Mulching' },
      { id: 'landscaping.aeration',       label: 'Aeration / overseeding' },
      { id: 'landscaping.sod_install',    label: 'Sod install' },
    ],
  },
  {
    id: 'snow-removal',
    label: 'Snow Removal',
    subServices: [
      { id: 'snow.driveway',    label: 'Driveway' },
      { id: 'snow.sidewalks',   label: 'Sidewalks / walkways' },
      { id: 'snow.steps',       label: 'Steps / entryways' },
      { id: 'snow.parking',     label: 'Parking area' },
      { id: 'snow.roof',        label: 'Roof' },
      { id: 'snow.patio_deck',  label: 'Patio or deck' },
      { id: 'snow.mailbox',     label: 'Mailbox or curb access' },
      { id: 'snow.salting',     label: 'Salting / de-icing' },
    ],
  },
  {
    id: 'painting',
    label: 'Painting',
    subServices: [
      { id: 'painting.interior',   label: 'Interior' },
      { id: 'painting.exterior',   label: 'Exterior' },
      { id: 'painting.cabinets',   label: 'Cabinet refinishing' },
      { id: 'painting.deck_fence', label: 'Deck / fence stain' },
      { id: 'painting.touch_ups',  label: 'Touch-ups' },
    ],
  },
  {
    id: 'roofing',
    label: 'Roofing',
    subServices: [
      { id: 'roofing.inspection',   label: 'Inspection' },
      { id: 'roofing.leak_repair',  label: 'Leak repair' },
      { id: 'roofing.shingles',     label: 'Shingle replacement' },
      { id: 'roofing.gutters_clean',label: 'Gutter cleaning' },
      { id: 'roofing.gutters_repair',label: 'Gutter repair' },
    ],
  },
  {
    id: 'carpentry',
    label: 'Carpentry',
    subServices: [
      { id: 'carpentry.custom_builds',  label: 'Custom builds' },
      { id: 'carpentry.trim_molding',   label: 'Trim / molding' },
      { id: 'carpentry.decking',        label: 'Decking' },
      { id: 'carpentry.framing',        label: 'Framing' },
      { id: 'carpentry.cabinet_install',label: 'Cabinet install' },
    ],
  },
  {
    id: 'concrete-masonry',
    label: 'Concrete & Masonry',
    subServices: [
      { id: 'masonry.concrete_repair',  label: 'Concrete repair' },
      { id: 'masonry.driveway_walkway', label: 'Driveway / walkway' },
      { id: 'masonry.brick_stone',      label: 'Brick / stone' },
      { id: 'masonry.patio_install',    label: 'Patio install' },
    ],
  },
  {
    id: 'moving',
    label: 'Moving & Heavy Lifting',
    subServices: [
      { id: 'moving.furniture_moving', label: 'Furniture moving' },
      { id: 'moving.heavy_lifting',    label: 'Heavy lifting' },
      { id: 'moving.junk_hauling',     label: 'Junk hauling' },
      { id: 'moving.donation_pickup',  label: 'Donation pickup' },
    ],
  },
];

// Flat map: trade id → all sub-service labels (used for auto-migration)
export const ALL_SUB_SERVICES_BY_TRADE: Record<string, string[]> = Object.fromEntries(
  TRADES.map(t => [t.id, t.subServices.map(s => s.label)])
);

// Legacy trade name → taxonomy id (for auto-migrating existing primary_trades values)
export const LEGACY_TRADE_TO_ID: Record<string, string> = {
  'Plumbing':            'plumbing',
  'Electrical':          'electrical',
  'HVAC':                'hvac',
  'General Contracting': 'handyman',
  'General Repairs':     'handyman',
  'Handyman':            'handyman',
  'Roofing':             'roofing',
  'Carpentry':           'carpentry',
  'Masonry':             'concrete-masonry',
  'Flooring':            'handyman',
  'Cleaning':            'cleaning',
  'Landscaping':         'landscaping',
  'Snow Removal':        'snow-removal',
  'Painting':            'painting',
  'Moving':              'moving',
};

// Convenience: flat array of all trade ids for validation
export const TRADE_IDS = TRADES.map(t => t.id);

// Convenience: lookup a trade by id
export function findTrade(id: string): Trade | undefined {
  return TRADES.find(t => t.id === id);
}

// Convenience: get sub-service labels for a given trade id
export function subServicesFor(tradeId: string): string[] {
  return findTrade(tradeId)?.subServices.map(s => s.label) ?? [];
}
