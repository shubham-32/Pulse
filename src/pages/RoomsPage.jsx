// RoomsPage (Task 20) — the Rooms & Devices view. Fully state-driven from the
// shared PULSE context: appliances are grouped by `room` and each renders an
// interactive RoomDeviceCard. The page lets the user take direct control of any
// device (power, speed/brightness/temperature) with a manual-override mode and a
// "Return to AI" undo, while the ambient automation keeps running underneath.
//
// Because every page reads the SAME appliances state via the provider, controls
// here are reflected on the dashboard shelf too — one source of truth.
//
// This page lives inside AppLayout's routed content area, so it uses normal
// top-aligned page flow and scrolls naturally (min-h-full), not a locked viewport.

import { motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';
import { PanelHeading } from '../components/GlassPanel.jsx';
import RoomDeviceCard from '../components/RoomDeviceCard.jsx';

export default function RoomsPage() {
  const {
    rooms,
    appliances,
    toggleAppliancePower,
    setApplianceControl,
    returnApplianceToAI,
  } = usePulse();

  // Group appliances by room id (one pass), then render only rooms that have
  // devices so the page stays uncluttered.
  const byRoom = appliances.reduce((acc, a) => {
    (acc[a.room] ||= []).push(a);
    return acc;
  }, {});
  const populatedRooms = rooms.filter((r) => (byRoom[r.id]?.length ?? 0) > 0);

  const onlineCount = appliances.filter((a) => a.online).length;
  const totalCount = appliances.length;

  return (
    <div className="min-h-full w-full p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Page header: eyebrow, title, and a live device summary. */}
        <header>
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-cyan animate-pulse" />
            <PanelHeading>Spaces</PanelHeading>
          </div>

          <h1 className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Rooms &amp; Devices
          </h1>

          <p className="mt-3 font-sans text-sm text-white/55">
            <span className="font-semibold tabular-nums text-white/80">
              {onlineCount} of {totalCount}
            </span>{' '}
            devices online across{' '}
            <span className="font-semibold tabular-nums text-white/80">
              {populatedRooms.length}
            </span>{' '}
            rooms · control any device directly or hand it back to PULSE
          </p>
        </header>

        {/* One section per populated room: heading + device count, then a
            responsive grid of interactive control cards. */}
        <motion.div
          className="mt-8 flex flex-col gap-10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
          }}
        >
          {populatedRooms.map((room) => {
            const devices = byRoom[room.id];
            return (
              <section key={room.id}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-sans text-lg font-bold tracking-tight text-white/90">
                    {room.name}
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-sans text-[11px] tabular-nums text-white/45">
                    {devices.length} {devices.length === 1 ? 'device' : 'devices'}
                  </span>
                </div>

                <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {devices.map((appliance) => (
                    <RoomDeviceCard
                      key={appliance.id}
                      appliance={appliance}
                      onTogglePower={toggleAppliancePower}
                      onSetControl={setApplianceControl}
                      onReturnToAI={returnApplianceToAI}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
