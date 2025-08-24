#!/usr/bin/env node

 /**
 * Test script for ElevenLabs TTS integration
 * Run with: node scripts/test-tts.js
 */

 const baseUrl = "http://localhost:3000";

 
async function textTTSAPI(){

    console.log('testing ElevenLabs TTS Integration...\n');
    
    // Test 1 : Check TTS service status 

    console.log('1. Checking TTS service status...');

    try {

        const statusResponse = await fetch(`${baseUrl}/api/tts`);
        const statusData = await statusResponse.json();
        console.log('Status :', statusData);
        
    } catch (error) {
        console.error('Status check  failed:', error.message);
    }


    console.log('\n2. Testing speech generation for Hitesh...');

    try {
        const hiteshResponse = await fetch(`${baseUrl}/api/tts`, {
            method : 'POST',
            headers : {
                'Content-Type' : 'application/json',
            },
            body : JSON.stringify({
                text: "Hello ! this is Hitesh speaking. I am texting the ElevenLabs voice cloning integration",
                persona : "hitesh",
            })
        })


        const hiteshData = await hiteshResponse.json();
        console.log('Hitesh response:', hiteshData);

        if(hiteshData.success && hiteshData.audioUrl){
            console.log(`Hitesh speech generation successfully: ${baseUrl}${hiteshData.audioUrl}`)
        }else if(hiteshData.voiceConfig){
            console.log('Fallback to client-side synthesis');
        }
    } catch (error) {
        console.error('Hitesh speech generation failed:', error.message);
    }


    console.log('\n3. Testing speech generation for Piyush...');

    try {
        
        const piyushResponse = await fetch(`${baseUrl}/api/tts`, {
            method : 'POST',
            headers : {
                'content-type' : 'application/json',
            },
            body : JSON.stringify({
                text : "Hello there! This is Piyush here. Testing the voice synthesis with different settings.",
                persona : 'piyush'
            })
        })

        const piyushData = await piyushResponse.json();
        console.log('Piyush response:', piyushData);

        if(piyushData.success && piyushData.audioUrl){
            console.log(`Piyush speech generation successfully: ${baseUrl}${piyushData.audioUrl}`)
        }else if(piyushData.voiceConfig){
            console.log('Fallback to client-side synthesis');
        }
    } catch (error) {
        console.error('Piyush speech generation failed:', error.message);
    }

    console.log('\n4. Testing error handling (invalid persona)...');

    try {
        const errorResponse = await fetch(`${baseUrl}/api/tts`, {
            method : "POST",
            headers : {
                'content-type' : "application/json"
            },
            body : JSON.stringify({
                text : "This should fail",
                persona : "invalid_persona"
            })
        })

        const errorData = await errorResponse.json();
        console.log('Error response:', errorData);

        if(errorResponse.status === 400){
            console.log('Error handling successful');
        }
    } catch (error) {
        console.error('Error handling failed:', error.message);
    }

    console.log('\n TTS texting completed!');
    console.log('\n Setup Instruction:');
    console.log('1. Add your ElevenLabs API key to .env.local');
    console.log('2. Add voice IDs for hitesh and piyush');
    console.log('3. Start the development server');
    console.log('4. check generated audio files in public/generated-audio/');

}
    // run the test if this script is executed directly
    if (require.main === module) {
        textTTSAPI();
    }

module.exports = { textTTSAPI };