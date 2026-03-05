import { NextRequest, NextResponse } from "next/server";

// POST /api/launch
// Takes onboarding form data, generates config files, provisions instance
export async function POST(req: NextRequest) {
  const data = await req.json();

  const {
    ownerName,
    businessName,
    websiteUrl,
    instagram,
    tiktok,
    linkedin,
    twitter,
    facebook,
    competitors,
    postingGoal,
    chatChannel,
  } = data;

  // 1. Generate USER.md
  const userMd = `# USER.md — About the Business Owner

- **Name:** ${ownerName}
- **Business:** ${businessName}
- **Website:** ${websiteUrl}
- **Timezone:** (to be detected)
- **Chat channel:** ${chatChannel}

## Social Accounts
${instagram ? `- **Instagram:** ${instagram}` : ""}
${tiktok ? `- **TikTok:** ${tiktok}` : ""}
${linkedin ? `- **LinkedIn:** ${linkedin}` : ""}
${twitter ? `- **X/Twitter:** ${twitter}` : ""}
${facebook ? `- **Facebook:** ${facebook}` : ""}

## Onboarding Info
- **Competitors:** ${competitors || "None provided — Tevy will discover them"}
- **Posting goal:** ${postingGoal}
- **Brand guidelines uploaded:** No

## Notes
- Onboarded via tevy2.ai setup wizard on ${new Date().toISOString().split("T")[0]}
`;

  // 2. Generate initial brand-profile.md (to be filled by agent)
  const brandProfileMd = `# Brand Profile

> Pending analysis. Tevy will scrape ${websiteUrl} and fill this in.

## Business
- **Name:** ${businessName}
- **Website:** ${websiteUrl}
- **Industry/Niche:** (pending analysis)
- **What they sell/do:** (pending analysis)

## Brand Voice
- **Tone:** (pending analysis)
- **Style:** (pending analysis)

## Target Audience
- **Who:** (pending analysis)
- **Pain points:** (pending analysis)

## Value Proposition
- **Core promise:** (pending analysis)
- **What makes them different:** (pending analysis)

## Social Presence
- **Platforms active on:** ${[instagram && "Instagram", tiktok && "TikTok", linkedin && "LinkedIn", twitter && "X", facebook && "Facebook"].filter(Boolean).join(", ") || "None connected"}
- **Posting frequency:** Goal: ${postingGoal}

## Notes
- Brand profile pending. Agent will analyze on first boot.
`;

  // 3. Generate competitors.md
  const competitorsList = competitors
    ? competitors.split(",").map((c: string, i: number) => `## Competitor ${i + 1}\n- **Name:** ${c.trim()}\n- **Recent activity:** (pending research)\n`).join("\n")
    : "## No competitors provided yet\nTevy will ask about competitors during first conversation.\n";

  const competitorsMd = `# Competitors\n\n> Tracked competitors. Updated by Tevy during research.\n\n${competitorsList}`;

  // TODO: In production, this would:
  // - Create user record in DB
  // - Spin up Docker container with OpenClaw
  // - Write these files to the instance workspace
  // - Configure channel (TG/WA/webchat)
  // - Configure Postiz integration
  // - Return webchat URL

  // For now, return the generated configs
  console.log("=== LAUNCHING TEVY INSTANCE ===");
  console.log("Business:", businessName);
  console.log("Website:", websiteUrl);
  console.log("Channel:", chatChannel);
  console.log("Generated USER.md:", userMd.length, "bytes");
  console.log("Generated brand-profile.md:", brandProfileMd.length, "bytes");
  console.log("Generated competitors.md:", competitorsMd.length, "bytes");

  return NextResponse.json({
    success: true,
    instanceId: `tevy-${Date.now()}`,
    chatUrl: "/chat",
    configs: {
      userMd,
      brandProfileMd,
      competitorsMd,
    },
  });
}
