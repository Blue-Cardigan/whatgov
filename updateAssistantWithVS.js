// update-assistant.js
require('dotenv').config(); // If you're using environment variables
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set your API key
});

async function updateAssistant() {
  try {
    const updatedAssistant = await openai.beta.assistants.update(
      'asst_bpNzLmJEazBNp1dODKc7RTSf',
      {
        tools: [{ type: "file_search" }], // Enable file search capability
        file_ids: ['vs_NlZ1KHiDJGYdr7ZzirHLEIzR'], // Attach the vector store
      }
    );

    console.log('Assistant updated successfully:', updatedAssistant);
  } catch (error) {
    console.error('Error updating assistant:', error);
  }
}

updateAssistant();