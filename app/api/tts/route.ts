import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync,mkdirSync } from "fs";
import crypto from "crypto";

// Dynamic ElevenLabs client initialization
import type { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
// import { error } from "console";
let elevenlabs: ElevenLabsClient | null = null;

async function getElevenLabsClient(){
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

function generateAudioFilename(text: string, person: string): string {
    const hash = crypto.createHash('md5').update(`${text}-${person}`).digest('hex');
    return `${person}_${hash.substring(0, 8)}.mp3`;
}

function audioFileExists(filename: string): boolean{
    // In serverless environments, we can't persist files, so always return false
    if(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME){
        
        return false;
    }

    const filePath = join(process.cwd(),'public','generated-audio',filename);
    return existsSync(filePath);
}

async function generateSpeech(text : string,persona : string) : Promise<string>{
    const config =VOICE_CONFIG[persona as keyof typeof VOICE_CONFIG] || VOICE_CONFIG.hitesh;
    const filename = generateAudioFilename(text,persona);
    
    if(audioFileExists(filename)){
        console.log(`Using cached audio for ${persona}: ${filename}`);
        return `/generated-audio/${filename}`;
    }

     try {
        
        console.log(`Generating speech for ${persona} with voice ID: ${config.voiceId}`);

        const client = await getElevenLabsClient();
        //Generate audio using ElevenLabs

        const audio = await client.textToSpeech.convert(config.voiceId,{
            text : text,
            model_id: MODEL_ID,
            voice_settings: {
                stability: config.settings.stability,
                similarity_boost: config.settings.similarityBoost,
                style: config.settings.style,
                use_speaker_boost: config.settings.useSpeakerBoost,
            }
        });

        const chunks : Uint8Array[] =[];
        const reader = audio.getReader();

        try {
            while(true){
                const {done,value} = await reader.read();
                if(done) break;
                if(value) chunks.push(value);
            }
        } finally{
                reader.releaseLock();
            }

        const audioBuffer = new Uint8Array(chunks.reduce((total,chunk) => total + chunk.length,0));
        let offset = 0;
        for(const chunk of chunks){
            audioBuffer.set(chunk,offset);
            offset += chunk.length;
        }

        //For serverless environments, return the audion directly without saving to file
        if(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME){
           // convert audio buffer to base64 data URL
           const base64Audio = Buffer.from(audioBuffer).toString('base64');
           const dataUrl = `data:audio/mpeg;base64,${base64Audio}`;

           console.log(`Audio generated successfully for serverless : ${filename}`);
           return dataUrl;
        }

        // For local development save to file as befour
        const audioDir = join(process.cwd(),'public','generated-audio');
        if(!existsSync(audioDir)){
            mkdirSync(audioDir,{ recursive : true});
        }

        // Save the audio file
        const filePath = join(audioDir,filename);
        await writeFile(filePath,audioBuffer);

        console.log(`Audio save successfully : ${filename}`);
        return `/generated-audio/${filename}`;


    } catch (error) {
        console.log('ElevenLabs API error:', error);
        throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


export async function POST(request: NextRequest){

    try {
        
        const {text,persona} = await request.json();

        //Validate required fields
        if(!text || !persona){
            return NextResponse.json({
                error : "Missing required fields: text and persona are required."
            },
            {status: 400}
        );
        }

        // validate persona
        if(!Object.keys(VOICE_CONFIG).includes(persona)){
            return NextResponse.json({
                error : `Invalid persona: ${persona}. Valid personas are: ${Object.keys(VOICE_CONFIG).join(', ')}`
            },
            {status: 400}
        );
        }

        // Check if ElevenLabs API key is configured
        if(!process.env.ELEVEN_LABS_API_KEY){
            return NextResponse.json({
                error : "ElevenLabs API key is not configured."
            },
            {status: 500}
        );
        }

        //Validate text lenght (ElevenLabs has character limits)

        if(text.length > 2500){
            return NextResponse.json({
                error : "text to long. Maximum 2500 characters allowed."
            },
        {status : 400});
        }

        try{

            const audioUrl = await generateSpeech(text,persona);

            return NextResponse.json({
                success : true,
                audioUrl : audioUrl,
                text: text,
                persona : persona,
                message : 'speech generated successfully'
            });
        }catch(speechError){

            console.error('Speech generation failed:', speechError);

            //return fallbeck response for client-side synthesis

            const fallbeckconfig = {
                hitesh: { rate: 0.9, pitch: 0.8, volume: 1.0, voiceIndex: 0 },
                piyush: { rate: 0.95, pitch: 1.1, volume: 1.0, voiceIndex: 1 }
            }

            const config = fallbeckconfig[persona as keyof typeof fallbeckconfig] || fallbeckconfig.hitesh;

            return NextResponse.json({
                success : false,
                audioUrl : null,
                voiceConfig : config,
                text : text,
                persona : persona,
                message : 'Fallback to client-side synthesis',
                error: speechError instanceof Error ? speechError.message : 'Speech generation failed'
            },{status : 200})
        }

    } catch (error) {
       console.error('TTS API error:', error);
       return NextResponse.json(
      { error: 'Failed to process TTS request' },
      { status: 500 }
    );
  }

}

export async function GET() {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      availablePersonas: Object.keys(VOICE_CONFIG),
      modelId: MODEL_ID,
      message: 'TTS service is ready'
    });
  } catch (error) {
    console.error('TTS status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check TTS service status' },
      { status: 500 }
    );
  }
}
