import type { GalleryImage } from "./InfiniteGallery.js";

/**
 * A curated, self-hosted subset (3 per station-console topic) of the exact same NASA Image
 * and Video Library photos the station consoles pull live via /api/nasa-images — downloaded
 * once (player request: the live version loaded too late, since every one of the ~60 live
 * photos had to round-trip through the CORS proxy and resolve before the WebGL gallery's
 * first paint — see git history for that approach) and served from this project's own origin
 * instead. Same-origin means no proxy, no round trip to images-assets.nasa.gov, and the PWA
 * service worker precaches these for offline use the same as any other image asset.
 *
 * Decorative only — see StationImageGallery.tsx's own doc comment for why this is aria-hidden
 * rather than carrying per-image credit text (the same photos already do, in the consoles).
 */
export const GALLERY_IMAGES: readonly GalleryImage[] = [
  { src: "/images/gallery/PIA14471.jpg", alt: "Plausible Martian Habitats" },
  { src: "/images/gallery/PIA23302.jpg", alt: "First Humans on Mars (Artist's Concept)" },
  { src: "/images/gallery/MSFC-201900576.jpg", alt: "NASA 3D-Printed Habitat Challenge" },
  { src: "/images/gallery/LRC-2011-00020.jpg", alt: "Expandable Lunar Habitat (X-Hab)" },
  { src: "/images/gallery/LRC-2011-00021.jpg", alt: "Expandable Lunar Habitat (X-Hab)" },
  { src: "/images/gallery/LRC-2011-00022.jpg", alt: "Expandable Lunar Habitat (X-Hab)" },
  { src: "/images/gallery/PIA25136.jpg", alt: "A New Antenna for NASA's Deep Space Network" },
  { src: "/images/gallery/PIA24163.jpg", alt: "New All-in-One Antenna for the Deep Space Network" },
  { src: "/images/gallery/PIA26147.jpg", alt: "Six Deep Space Network Antennas in Madrid Arrayed For the First Time" },
  { src: "/images/gallery/iss043e181459.jpg", alt: "Node 3 CDRA Replacement" },
  { src: "/images/gallery/iss039e010369.jpg", alt: "Swanson during Day 2 of CDRA IFM" },
  { src: "/images/gallery/iss039e010367.jpg", alt: "Swanson during Day 2 of CDRA IFM" },
  { src: "/images/gallery/KSC-20180307-PH_CSH01_0015.jpg", alt: "PONDS Watering System for Veggie" },
  { src: "/images/gallery/KSC-20180307-PH_CSH01_0029.jpg", alt: "PONDS Watering System for Veggie" },
  { src: "/images/gallery/KSC-20180307-PH_CSH01_0002.jpg", alt: "PONDS Watering System for Veggie" },
  { src: "/images/gallery/PIA24176.jpg", alt: "Engineers Lower MOXIE into Perseverance" },
  { src: "/images/gallery/PIA26041.jpg", alt: "The Sound of MOXIE at Work on Mars" },
  { src: "/images/gallery/PIA24203.jpg", alt: "MOXIE All Tucked In" },
  { src: "/images/gallery/PIA13523.jpg", alt: "The Lunar South Pole" },
  { src: "/images/gallery/PIA12905.jpg", alt: "Lunar South Pole - Out of the Shadows" },
  { src: "/images/gallery/PIA00001.jpg", alt: "South Pole Region of the Moon as Seen by Clementine" },
];
