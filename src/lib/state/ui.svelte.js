// @ts-check

export const ui = $state({
  /** 'list' | 'settings' */
  tab: 'list',
  /** team _id whose riders are highlighted; '' = none */
  selectedTeam: '',
  /** @type {number|null} bib whose color card is open */
  selectedRider: null,
  showBibs: false,
});
