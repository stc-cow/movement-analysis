import { createClient } from "@supabase/supabase-js";

let supabaseServerInstance: any = null;
let supabasePublicInstance: any = null;
let initialized = false;

function initializeClients() {
  if (initialized) return;
  initialized = true;

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl) {
    console.error("❌ SUPABASE_URL not set");
  }

  if (!supabaseAnonKey) {
    console.error("❌ SUPABASE_ANON_KEY not set");
  }

  // Client for server-side queries (service role - can do everything)
  if (supabaseServiceKey && supabaseUrl) {
    try {
      supabaseServerInstance = createClient(supabaseUrl, supabaseServiceKey);
    } catch (error) {
      console.error("❌ Failed to initialize Supabase server client:", error);
    }
  }

  // Client for public queries (anon key - RLS enforced)
  if (supabaseAnonKey && supabaseUrl) {
    try {
      supabasePublicInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
      console.error("❌ Failed to initialize Supabase public client:", error);
    }
  }
}

// Lazy getters
export function getSupabaseServer() {
  initializeClients();
  return supabaseServerInstance;
}

export function getSupabasePublic() {
  initializeClients();
  return supabasePublicInstance;
}

// For backward compatibility
export const supabaseServer = null;
export const supabasePublic = null;

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  return !!(supabaseUrl && supabaseAnonKey);
}

export async function fetchFromSupabase() {
  const client = getSupabaseServer();
  if (!client) {
    throw new Error("Supabase server client not configured");
  }

  try {
    console.log("📥 Fetching data from Supabase...");

    // Fetch all data in parallel
    const [movementsRes, cowsRes, locationsRes, eventsRes, neverMovedRes] =
      await Promise.all([
        client.from("movement_data").select("*"),
        client.from("dim_cow").select("*"),
        client.from("dim_location").select("*"),
        client.from("dim_event").select("*"),
        client.from("never_moved_cow").select("*"),
      ]);

    // Check for errors
    if (movementsRes.error) throw movementsRes.error;
    if (cowsRes.error) throw cowsRes.error;
    if (locationsRes.error) throw locationsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const movements = movementsRes.data || [];
    const cows = cowsRes.data || [];
    const locations = locationsRes.data || [];
    const events = eventsRes.data || [];
    const neverMoved = neverMovedRes.data || [];

    console.log(`✓ Fetched from Supabase:`);
    console.log(`  - ${movements.length} movements`);
    console.log(`  - ${cows.length} cows`);
    console.log(`  - ${locations.length} locations`);
    console.log(`  - ${events.length} events`);
    console.log(`  - ${neverMoved.length} never-moved cows`);

    // Transform Supabase data to match application schema
    return {
      movements: movements.map((m: any) => ({
        SN: m.sn,
        COW_ID: m.cow_id,
        From_Location_ID: m.from_location_id,
        From_Sub_Location: m.from_sub_location,
        To_Location_ID: m.to_location_id,
        To_Sub_Location: m.to_sub_location,
        Moved_DateTime: m.moved_datetime,
        Reached_DateTime: m.reached_datetime,
        Movement_Type: m.movement_type,
        Distance_KM: m.distance_km,
        Is_Royal: m.is_royal,
        Is_EBU: m.is_ebu,
        EbuRoyalCategory: m.ebu_royal_category,
        Vendor: m.vendor,
        Governorate: m.governorate,
      })),
      cows: cows.map((c: any) => ({
        COW_ID: c.cow_id,
        Tower_Type: c.tower_type,
        Tower_Height: c.tower_height,
        Network_2G: c.network_2g,
        Network_4G: c.network_4g,
        Network_5G: c.network_5g,
        Shelter_Type: c.shelter_type,
        Vendor: c.vendor,
        Installation_Date: c.installation_date,
        Last_Deploy_Date: c.last_deploy_date,
        First_Deploy_Date: c.first_deploy_date,
        Remarks: c.remarks,
      })),
      locations: locations.map((l: any) => ({
        Location_ID: l.location_id,
        Location_Name: l.location_name,
        Sub_Location: l.sub_location,
        Latitude: l.latitude,
        Longitude: l.longitude,
        Region: l.region,
        Governorate: l.governorate,
        Location_Type: l.location_type,
        Owner: l.owner,
      })),
      events: events.map((e: any) => ({
        Event_ID: e.event_id,
        Event_Type: e.event_type,
        Description: e.description,
        Start_Date: e.start_date,
        End_Date: e.end_date,
      })),
      neverMoved,
    };
  } catch (error) {
    console.error("❌ Failed to fetch from Supabase:", error);
    throw error;
  }
}
