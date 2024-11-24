export interface QueryPart {
  type: 'text' | 'spokenby' | 'debate' | 'words';
  value: string;
  isValid: boolean;
}

type QueryAction =
  | { type: 'SET_PARTS'; payload: QueryPart[] }
  | { type: 'UPDATE_PART'; payload: { index: number; value: string } }
  | { type: 'ADD_PART'; payload: QueryPart['type'] }
  | { type: 'REMOVE_PART'; payload: number }
  | { type: 'CHANGE_PART_TYPE'; payload: { index: number; partType: QueryPart['type'] } }
  | { type: 'SET_FOCUSED_INDEX'; payload: number | null };

interface QueryState {
  parts: QueryPart[];
  focusedIndex: number | null;
}

const getMinLength = (type: QueryPart['type']): number => {
  return {
    spokenby: 2,
    debate: 2,
    words: 1,
    text: 1
  }[type];
};

export function queryReducer(state: QueryState, action: QueryAction): QueryState {
  switch (action.type) {
    case 'SET_PARTS':
      return { ...state, parts: action.payload };

    case 'UPDATE_PART': {
      const { index, value } = action.payload;
      const newParts = [...state.parts];
      const part = newParts[index];
      if (!part) return state;

      newParts[index] = {
        ...part,
        value,
        isValid: value.length >= getMinLength(part.type)
      };
      
      return { ...state, parts: newParts };
    }

    case 'ADD_PART':
      return { ...state, parts: [...state.parts, { type: action.payload, value: '', isValid: true }] };

    case 'REMOVE_PART':
      return { ...state, parts: state.parts.filter((_, i) => i !== action.payload) };

    case 'CHANGE_PART_TYPE':
      return {
        ...state,
        parts: state.parts.map((part, i) => 
          i === action.payload.index 
            ? { type: action.payload.partType, value: '', isValid: true }
            : part
        )
      };

    case 'SET_FOCUSED_INDEX':
      return { ...state, focusedIndex: action.payload };

    default:
      return state;
  }
} 