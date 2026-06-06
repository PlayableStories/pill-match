import { PillType } from '../types';

export interface Prescription {
    message: string;
    pills: [PillType, PillType, ...PillType[]]; // always 2 or 3 pills
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit this array to define all prescription pop-ups.
//
// Each entry needs:
//   message  – sentence shown in the dialog (placeholder text for now)
//   pills    – 1 to 3 pill colors the player must eliminate IN ORDER
//
// There are two doses per day: MORNING then EVENING. Entries alternate by index,
// so EVEN indices (0, 2, 4, …) are morning doses and ODD indices are evening doses.
// Keep an even number of entries so the morning/evening pattern stays aligned as
// the list loops.
//
// PillType values:  0=red  1=blue  2=yellow  3=green  4=white
// ─────────────────────────────────────────────────────────────────────────────
export const PRESCRIPTIONS: Prescription[] = [
    {
        message: 'Good morning. Take your morning dose.',          // PLACEHOLDER
        pills: [0, 2],
    },
    {
        message: 'Good evening. Here is your evening dose.',        // PLACEHOLDER
        pills: [1, 4, 2],
    },
    {
        message: 'Rise and shine — your morning pills are ready.',  // PLACEHOLDER
        pills: [3, 0],
    },
    {
        message: 'Wind down with your evening medication.',         // PLACEHOLDER
        pills: [4, 0],
    },
    {
        message: 'Morning dose — take these with breakfast.',       // PLACEHOLDER
        pills: [2, 3, 1],
    },
    {
        message: 'Evening dose — take these after dinner.',         // PLACEHOLDER
        pills: [1, 4],
    },
];
