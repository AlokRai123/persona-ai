import { NextRequest, NextResponse } from "next/server";
import { writeFile,readFile } from "fs/promises";
import { join } from "path";
import { existsSync,mkdirSync } from "fs";
import crypto from "crypto";

// Dynamic ElevenLabs client initialization
import type { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
let elevenlabs: ElevenLabsClient | null = null;

async function getElevenLabsclient(){
    if(!elevenlabs){
        const {ElevenLabsClient} = await import("@elevenlabs/elevenlabs-js");
        elevenlabs = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY
        });
    }
    return elevenlabs;
}

const VOICE_CONFIG = {

    hitesh : {
        voiceId : process.env.ELEVENLABS_VOICE_ID_HITESH || 'default_voice_id',
        settings : {
            stability : 0.6,
            similarityBoost : 0.8,
            style : 0.0,
            useSpeakerBoost : true,
        } 
    },

    piyush : {
        voiceId : process.env.ELEVENLABS_VOICE_ID_PIYUSH || 'default_voice_id',
        settings : {
            stability : 0.6,
            similarityBoost : 0.8,
            style : 0.0,
            useSpeakerBoost : true,
        }
    }
};

//Model ID from environment or default

const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';


