import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getCurrentVectorStore() {
  try {
    // Get Monday of current week
    const mondayDate = new Date();
    mondayDate.setDate(mondayDate.getDate() - mondayDate.getDay() + 1);
    const mondayDateString = mondayDate.toISOString().split('T')[0];
    
    const storeName = `Parliamentary Debates - Week of ${mondayDateString}`;

    // Get all vector stores
    const vectorStores = await openai.beta.vectorStores.list();
    
    // Find store for current week
    const currentStore = vectorStores.data.find((store: OpenAI.Beta.VectorStore) => 
      store.name === storeName
    );

    if (currentStore) {
      console.log(`Found vector store: ${currentStore.name}`);
      
      return currentStore;
    } else {
      console.log('No vector store found for current week');
      return null;
    }

  } catch (error) {
    console.error('Failed to get current vector store:', error);
    throw error;
  }
} 