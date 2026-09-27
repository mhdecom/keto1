import { distanceKm, proximityScore, type Coordinates } from './geo';
import type { Player } from './types';

/**
 * Where two people can plausibly meet.
 *
 * A player has up to two anchors — home and, optionally, work. Treating them
 * as alternatives rather than averaging them matters: someone living in
 * Schwamendingen who works at Paradeplatz is a realistic partner for a
 * weekday-evening hit at Mythenquai and an unrealistic one on Sunday morning.
 * Averaging the two would put them in the lake and match them with nobody.
 */

export type AnchorKind = 'home' | 'work';

export interface Anchor extends Coordinates {
  kind: AnchorKind;
  /** District name, for display. */
  label: string;
}

export interface ClosestAnchors {
  km: number;
  from: Anchor;
  to: Anchor;
}

export function anchorsOf(player: Player): Anchor[] {
  const anchors: Anchor[] = [
    { kind: 'home', lat: player.lat, lon: player.lon, label: player.neighbourhood },
  ];
  if (player.workLat !== null && player.workLon !== null) {
    anchors.push({
      kind: 'work',
      lat: player.workLat,
      lon: player.workLon,
      label: player.workNeighbourhood,
    });
  }
  return anchors;
}

/** The shortest hop between any of one player's anchors and any of the other's. */
export function closestAnchors(viewer: Player, other: Player): ClosestAnchors {
  const mine = anchorsOf(viewer);
  const theirs = anchorsOf(other);

  let best: ClosestAnchors = {
    km: Infinity,
    from: mine[0],
    to: theirs[0],
  };

  for (const from of mine) {
    for (const to of theirs) {
      const km = distanceKm(from, to);
      if (km < best.km) best = { km, from, to };
    }
  }
  return best;
}

export interface LocationFit {
  score: number;
  closest: ClosestAnchors;
  sharedVenueIds: string[];
}

/**
 * Location compatibility from 0 to 1.
 *
 * A shared home court beats raw proximity — it is what makes a spontaneous
 * "court free in an hour?" realistic — but living or working nearby still
 * counts for a third of the score.
 */
export function locationFit(viewer: Player, other: Player): LocationFit {
  const closest = closestAnchors(viewer, other);
  const sharedVenueIds = viewer.venueIds.filter((id) => other.venueIds.includes(id));

  const bothHaveVenues = viewer.venueIds.length > 0 && other.venueIds.length > 0;
  const venueOverlap = bothHaveVenues
    ? sharedVenueIds.length / Math.min(viewer.venueIds.length, other.venueIds.length)
    : null;

  const nearby = proximityScore(closest.km);
  const score = venueOverlap === null ? nearby : venueOverlap * 0.65 + nearby * 0.35;

  return { score, closest, sharedVenueIds };
}

/**
 * A readable reason for the card, or null when the geography is unremarkable.
 *
 * Work anchors get their own wording because "she works two streets from your
 * office" is a far more concrete prompt than a distance in kilometres.
 */
export function describeProximity(
  viewer: Player,
  other: Player,
  closest: ClosestAnchors,
): string | null {
  const sameWorkArea =
    viewer.workNeighbourhood.length > 0 &&
    viewer.workNeighbourhood === other.workNeighbourhood;
  if (sameWorkArea) return `Ihr arbeitet beide: ${other.workNeighbourhood}`;

  const NEAR_KM = 2.5;
  if (closest.km > NEAR_KM) return null;

  const { from, to } = closest;
  if (from.kind === 'work' && to.kind === 'work') {
    return `Arbeitsorte ${formatKm(closest.km)} auseinander`;
  }
  if (from.kind === 'work' && to.kind === 'home') {
    return 'Wohnt gleich bei deinem Arbeitsort';
  }
  if (from.kind === 'home' && to.kind === 'work') {
    return 'Arbeitet gleich bei dir in der Nähe';
  }
  return `Nur ${formatKm(closest.km)} entfernt`;
}

export function formatKm(km: number): string {
  return km < 1 ? '<1 km' : `${km.toFixed(1)} km`;
}
