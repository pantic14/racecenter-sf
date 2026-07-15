// @ts-check

export const ui = $state({
  /** 'list' | 'profile' | 'climbs' | 'history' | 'settings' */
  tab: 'list',
  /** team _id whose riders are highlighted; '' = none */
  selectedTeam: '',
  /** @type {number|null} bib whose color card is open */
  selectedRider: null,
  /**
   * Replay session state, null when live.
   * @type {null | {id: string, playing: boolean, speed: number, i: number, total: number, t: number}}
   */
  replay: null,
  /** true while the replay picker (stage list / local file) is open */
  replayOpen: false,
});
