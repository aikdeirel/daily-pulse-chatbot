"use client";

import { useCallback, useEffect, useRef } from "react";
import { useArtifact } from "@/hooks/use-artifact";
import { type ArtifactKind, artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();

  // Track the current kind across stream parts to handle the case where
  // data-kind arrives before data-codeDelta/data-textDelta in the same batch
  const currentKindRef = useRef<ArtifactKind>(artifact.kind);

  // Store setMetadata in a ref to avoid dependency array issues
  // (setMetadata can change when artifact.documentId changes)
  const setMetadataRef = useRef(setMetadata);
  useEffect(() => {
    setMetadataRef.current = setMetadata;
  }, [setMetadata]);

  // Keep the ref in sync with artifact.kind when it changes externally
  useEffect(() => {
    currentKindRef.current = artifact.kind;
  }, [artifact.kind]);

  // Stable callback wrapper for setMetadata
  const stableSetMetadata = useCallback(
    (...args: Parameters<typeof setMetadata>) => {
      return setMetadataRef.current?.(...args);
    },
    [],
  );

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      // Update kind immediately when we receive it, so subsequent deltas use correct handler
      if (delta.type === "data-kind") {
        currentKindRef.current = delta.data;
        setArtifact((draftArtifact) => ({
          ...draftArtifact,
          kind: delta.data,
          status: "streaming",
        }));
      } else if (delta.type === "data-id") {
        setArtifact((draftArtifact) => ({
          ...draftArtifact,
          documentId: delta.data,
          status: "streaming",
        }));
      } else if (delta.type === "data-title") {
        setArtifact((draftArtifact) => ({
          ...draftArtifact,
          title: delta.data,
          status: "streaming",
        }));
      } else if (delta.type === "data-clear") {
        setArtifact((draftArtifact) => ({
          ...draftArtifact,
          content: "",
          status: "streaming",
        }));
      } else if (delta.type === "data-finish") {
        setArtifact((draftArtifact) => ({
          ...draftArtifact,
          status: "idle",
        }));
      }

      // Find artifact definition using the tracked kind (which may have been updated above)
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === currentKindRef.current,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata: stableSetMetadata,
        });
      }
    }
  }, [dataStream, setArtifact, stableSetMetadata, setDataStream]);

  return null;
}
