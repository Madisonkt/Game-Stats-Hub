const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  "https://byoadbkqwsuephrscmzr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5b2FkYmtxd3N1ZXBocnNjbXpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2NDYwMSwiZXhwIjoyMDg2ODQwNjAxfQ.0bjYsSbZRFAmrnBPkScOPqnSqhozEOsUOFGiYrq-oSw"
);

(async () => {
  // Find all couples that have rounds with game_key='rubiks'
  const { data: rounds } = await sb
    .from("rounds")
    .select("couple_id")
    .eq("game_key", "rubiks");

  if (!rounds || rounds.length === 0) {
    console.log("No rounds with game_key='rubiks' found.");
    return;
  }

  const coupleIds = [...new Set(rounds.map((r) => r.couple_id))];
  console.log("Couples with rubiks rounds:", coupleIds);

  for (const coupleId of coupleIds) {
    const count = rounds.filter((r) => r.couple_id === coupleId).length;

    // Create a Rubik's Cube game for this couple
    const { data: game, error } = await sb
      .from("games")
      .insert({
        couple_id: coupleId,
        name: "Rubik's Cube",
        icon: "timer-outline",
        game_type: "timed",
        is_archived: false,
      })
      .select()
      .single();

    if (error) {
      console.log("Insert error for couple", coupleId, ":", error.message);
      continue;
    }
    console.log(
      "Created game:",
      game.id,
      "for couple:",
      coupleId,
      "(" + count + " rounds)"
    );

    // Update all existing rubiks rounds to use the new game ID
    const { data: updated, error: updateErr } = await sb
      .from("rounds")
      .update({ game_key: game.id })
      .eq("couple_id", coupleId)
      .eq("game_key", "rubiks")
      .select("id");

    if (updateErr) {
      console.log("Update error:", updateErr.message);
      continue;
    }
    console.log("Updated", updated.length, "rounds to game_key:", game.id);
  }

  console.log("Done!");
})();
