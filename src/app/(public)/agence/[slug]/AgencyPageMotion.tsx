"use client";

import { motion } from "framer-motion";

export default function AgencyPageMotion({
  motionLevel,
  children,
}: {
  motionLevel: "none" | "subtle" | "rich";
  children: React.ReactNode;
}) {
  if (motionLevel === "none") return <>{children}</>;

  const offset = motionLevel === "rich" ? 24 : 14;
  const duration = motionLevel === "rich" ? 0.62 : 0.42;

  return (
    <motion.div
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

