"use client";

import React, { useMemo, useCallback } from "react";
import { useTerraformResourceStore } from "@/store/useTerraformResourceStore";
import { Shield, KeyRound, Fingerprint } from "lucide-react";
import closeSettingsorConfig from "@/utils/closeSettingsorConfig";
import ResourceFolder from "./ResourceFolder";
import ResourceItem from "./ResourceItem";
import openSettings from "@/utils/openSettings";
import { ResourceType } from "@/store/useTerraformResourceStore";
import SettingsPanelShell from "./SettingsPannel/SettingsPanelShell";

interface TerraformSideMenuProps {
  editorWidth: number;
}

export default function TerraformSideMenu({ editorWidth }: TerraformSideMenuProps) {
  const { resources, addResource, deleteResource } = useTerraformResourceStore();

  const securityGroups = useMemo(
    () => resources.filter((r) => r.type === "securitygroup"),
    [resources]
  );
  const keyPairs = useMemo(() => resources.filter((r) => r.type === "keypair"), [resources]);
  const IAM = useMemo(() => resources.filter((r) => r.type === "iam"), [resources]);

  const handleNewResource = useCallback(
    (labelType: ResourceType) => {
      const newLabel = `${labelType}-${Date.now()}`;
      const id = addResource(labelType, { Name: newLabel });
      openSettings(id, "resource");
    },
    [addResource]
  );

  const renderResourceList = useCallback(
    (items: typeof resources) =>
      items.map(({ id, data }) => (
        <ResourceItem
          key={id}
          name={(data as { Name?: string }).Name ?? id}
          onDelete={() => deleteResource(id)}
          onClick={() => openSettings(id, "resource")}
        />
      )),
    [deleteResource]
  );

  return (
    <SettingsPanelShell
      editorWidth={editorWidth}
      title="Global Configuration"
      subtitle="Manage global AWS resources"
      onClose={closeSettingsorConfig}
    >
      <div className="space-y-4">
        <ResourceFolder
          title="Security Groups"
          icon={<Shield className="h-4 w-4 text-sky-400" />}
          count={securityGroups.length}
          onAdd={() => handleNewResource("securitygroup")}
        >
          {securityGroups.length === 0 ? (
            <p className="text-xs text-neutral-500 py-1">No security groups defined.</p>
          ) : (
            renderResourceList(securityGroups)
          )}
        </ResourceFolder>

        <ResourceFolder
          title="Key Pairs"
          icon={<KeyRound className="h-4 w-4 text-amber-400" />}
          count={keyPairs.length}
          onAdd={() => handleNewResource("keypair")}
        >
          {keyPairs.length === 0 ? (
            <p className="text-xs text-neutral-500 py-1">No key pairs defined.</p>
          ) : (
            renderResourceList(keyPairs)
          )}
        </ResourceFolder>

        <ResourceFolder
          title="IAM"
          icon={<Fingerprint className="h-4 w-4 text-violet-400" />}
          count={IAM.length}
          onAdd={() => handleNewResource("iam")}
        >
          {IAM.length === 0 ? (
            <p className="text-xs text-neutral-500 py-1">No IAM roles defined.</p>
          ) : (
            renderResourceList(IAM)
          )}
        </ResourceFolder>
      </div>
    </SettingsPanelShell>
  );
}