import OpenAI from 'openai';
import dotenv from 'dotenv';
    
// Initialize environment variables
dotenv.config();

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set your API key as an environment variable
});

async function createAssistantWithVectorStore() {
  try {
    // Create a new assistant with file search capabilities
    const assistant = await openai.beta.assistants.create({
      name: "Vector Store Assistant",
      description: "An assistant with access to a vector store for enhanced search capabilities",
      model: "gpt-4o",
      tools: [
        {
          type: "file_search" // This enables file search capabilities
        }
      ],
      instructions: "You are an expert parliamentary analyst specializing in Identifying upcoming changes in financial policy which are likely to have a negative impact on the poor in the UK. \n" +
      "Use the provided debate details to answer questions accurately and cite specific debates when possible.\n" +
      "Always maintain a formal and professional tone appropriate for parliamentary discourse."
    });

    await openai.beta.assistants.update(assistant.id, {
        tool_resources: { file_search: { vector_store_ids: ["vs_NlZ1KHiDJGYdr7ZzirHLEIzR"] } },
      });

    console.log('Assistant created successfully:', assistant);
    return assistant;
  } catch (error) {
    console.error('Error creating assistant:', error);
    throw error;
  }
}

// Execute the function
createAssistantWithVectorStore()
  .then(assistant => {
    console.log('Assistant ID:', assistant.id);
  })
  .catch(error => {
    console.error('Failed to create assistant:', error);
  });