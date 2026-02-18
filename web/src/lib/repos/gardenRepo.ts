/**
 * Supabase-backed Digital Garden repository.
 * CRUD for garden doodle items within a couple.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// ── Types ───────────────────────────────────────────────────

export interface GardenItem {
  id: string;
  coupleId: string;
  createdBy: string;
  originId: string;
  doodleSvg: string;
  photoPath: string;
  caption: string | null;
  linkUrl: string | null;
  photoTakenAt: number | null; // epoch ms – EXIF date photo was taken
  createdAt: number; // epoch ms
}

interface GardenRow {
  id: string;
  couple_id: string;
  created_by: string;
  origin_id: string;
  doodle_svg: string;
  photo_path: string;
  caption: string | null;
  link_url: string | null;
  photo_taken_at: string | null;
  created_at: string;
}

function toDomain(row: GardenRow): GardenItem {
  return {
    id: row.id,
    coupleId: row.couple_id,
    createdBy: row.created_by,
    originId: row.origin_id,
    doodleSvg: row.doodle_svg,
    photoPath: row.photo_path,
    caption: row.caption,
    linkUrl: row.link_url,
    photoTakenAt: row.photo_taken_at ? new Date(row.photo_taken_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// ── Public API ──────────────────────────────────────────────

/** List all garden items for a couple, newest first */
export async function listGardenItems(coupleId: string): Promise<GardenItem[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await (supabase.from("garden_items") as any)
    .select("*")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list garden items:", error);
    return [];
  }
  return (data ?? []).map((r: GardenRow) => toDomain(r));
}

/**
 * Create a new garden item: upload photo, insert row.
 */
export async function createGardenItem({
  coupleId,
  createdBy,
  doodleSvg,
  photoFile,
  caption,
  linkUrl,
  photoTakenAt,
}: {
  coupleId: string;
  createdBy: string;
  doodleSvg: string;
  photoFile?: File;
  caption?: string;
  linkUrl?: string;
  photoTakenAt?: Date | null;
}): Promise<GardenItem> {
  const supabase = createSupabaseBrowserClient();
  const itemId = crypto.randomUUID();
  const originId = crypto.randomUUID();
  let photoPath = "";

  // Upload photo if provided
  if (photoFile) {
    photoPath = `couples/${coupleId}/${itemId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("garden-photos")
      .upload(photoPath, photoFile, {
        contentType: photoFile.type || "image/jpeg",
        upsert: true,
      });
    if (uploadError) {
      throw new Error(`Photo upload failed: ${uploadError.message}`);
    }
  }

  // Insert garden_items row
  const { data, error } = await (supabase.from("garden_items") as any)
    .insert({
      id: itemId,
      couple_id: coupleId,
      created_by: createdBy,
      origin_id: originId,
      doodle_svg: doodleSvg,
      photo_path: photoPath,
      caption: caption || null,
      link_url: linkUrl || null,
      ...(photoTakenAt ? { photo_taken_at: photoTakenAt.toISOString() } : {}),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create garden item");
  }

  return toDomain(data as GardenRow);
}

/** Delete a garden item and its photo */
export async function deleteGardenItem(itemId: string, photoPath: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  // Delete photo from storage
  await supabase.storage.from("garden-photos").remove([photoPath]);

  // Delete row
  await (supabase.from("garden_items") as any).delete().eq("id", itemId);
}

/** Subscribe to realtime changes on garden_items for a couple */
export function subscribeGardenItems(
  coupleId: string,
  onUpdate: (items: GardenItem[]) => void
): () => void {
  const supabase = createSupabaseBrowserClient();

  const channel = supabase
    .channel(`garden-${coupleId}`)
    .on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table: "garden_items",
        filter: `couple_id=eq.${coupleId}`,
      },
      () => {
        // Re-fetch full list on any change
        listGardenItems(coupleId).then(onUpdate);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Get public URL for a garden photo */
export function getGardenPhotoUrl(photoPath: string): string {
  const supabase = createSupabaseBrowserClient();
  const { data } = supabase.storage.from("garden-photos").getPublicUrl(photoPath);
  return data.publicUrl;
}
