# Hansard Search API Reference

## Base Search Parameters
All search endpoints accept these common query parameters:
- `format`: (required) Output format (xml/json)
- `house`: Parliamentary house (Commons/Lords)
- `startDate`/`endDate`: Date range (yyyy-mm-dd)
- `date`: Specific date to search
- `searchTerm`: Term to search for
- `skip`/`take`: Pagination controls
- `orderBy`: SittingDateAsc or SittingDateDesc

## Search Directives
Search terms can use special directives:
- `spokenby:name` - Find content spoken by named person
- `debate:text` - Find content in debates matching text
- `words:text` - Find content containing specific words
- Multiple directives can be combined with AND

## Main Endpoints

### 1. Full Search `/search.json`
Searches across all content types (contributions, statements, answers, corrections, petitions, committees, divisions, members).
- Returns max 4 results per type
- Returns totals for each content type
- Includes full member details and references

### 2. Member Search `/search/members.json` 
Searches for members by name
- Can filter for current/former members
- Returns basic member details

### 3. Contributions Search `/search/contributions/{contributionType}.json`
Searches specific contribution types:
- Types: Spoken, Written, Corrections, Petitions
- Can filter by house, member, debate, section
- OutputType: List or Group

### 4. Committee Search `/search/committees.json`
Searches committee content:
- Filterable by committee title and type
- Can include/exclude committee divisions
- Returns committee details and references

### 5. Divisions Search `/search/divisions.json`
Searches parliamentary divisions:
- Returns voting information when memberId specified
- Can filter for divisions within committees
- Includes division outcomes and voting records

## Common Response Objects

### FullSearchResult
Contains:
- Total counts for each content type
- Arrays of matched content:
  - Members
  - Contributions
  - Written content
  - Debates
  - Divisions
  - Committees

### SearchDebateItem
Represents a debate result:
- DebateSection: Section identifier
- SittingDate: Date of debate
- House: Commons/Lords
- Title: Debate title
- Rank: Result relevance
- DebateSectionExtId: External reference

### Member Result
Contains:
- Basic member details
- Total result count
- Optional voting record (when requested)

## Additional Features
- Timeline grouping (Day/Month/Year)
- Committee division inclusion controls
- Department and debate type filtering
- Series/Volume/Column number filtering
- Hansard identifier lookup