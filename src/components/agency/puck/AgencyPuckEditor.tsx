"use client";

import { useMemo } from "react";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import {
  agencyStorefrontPuckConfig,
  normalizeAgencyPuckData,
  type AgencyPuckData,
} from "@/lib/agency-storefront-puck";

type AgencyPuckEditorProps = {
  value: unknown;
  onChange: (next: AgencyPuckData) => void;
};

const EMPTY_PUCK_DATA: AgencyPuckData = {
  root: { props: {} },
  content: [],
};

export default function AgencyPuckEditor({ value, onChange }: AgencyPuckEditorProps) {
  const data = useMemo(() => normalizeAgencyPuckData(value) ?? EMPTY_PUCK_DATA, [value]);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <Puck
        config={agencyStorefrontPuckConfig}
        data={data}
        onChange={(next) => onChange(next as AgencyPuckData)}
        headerTitle="Builder visuel agence"
        height="min(860px, 78vh)"
      />
    </div>
  );
}
