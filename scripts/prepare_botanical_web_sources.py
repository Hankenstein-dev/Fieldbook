#!/usr/bin/env python3
"""Extract descriptive sections from exact, specialist species accounts.

Search matches alone never establish identity. Broader accounts, comparison
mentions, PDFs with multiple taxa, and unsupported providers stay in review.
"""
import re
from collections import Counter
from urllib.parse import urlparse
from recover_plant_sources import ROOT, CORPUS, read, write, norm, sha, compact, now

PROVIDERS = {
    'britishbryologicalsociety.org.uk': ('British Bryological Society', 'en', 'British and Irish account; local occurrence is not native origin'),
    'seaweed.ie': ('Seaweed.ie, Michael D. Guiry', 'en', 'British and Irish seaweed account; local occurrence is not native origin'),
    'doris.ffessm.fr': ('DORIS, FFESSM', 'fr', 'Requested species account; retain regional qualifications'),
    'marlin.ac.uk': ('MarLIN, Marine Biological Association', 'en', 'British and Irish account; local occurrence is not native origin'),
    'habitas.org.uk': ('National Museums Northern Ireland, Habitas', 'en', 'Regional account; local occurrence is not native origin'),
    'westglamorganflora.org.uk': ('West Glamorgan Flora', 'en', 'West Glamorgan regional account; local occurrence is not native origin'),
    'ohiomosslichen.org': ('Ohio Moss and Lichen Association', 'en', 'Ohio regional account; local occurrence is not native origin'),
    'rhs.org.uk': ('Royal Horticultural Society', 'en', 'Requested taxon account; distinguish native distribution from cultivation and garden preferences'),
    'pza.sanbi.org': ('PlantZAfrica, South African National Biodiversity Institute', 'en', 'Requested taxon account; preserve geographic and use qualifications'),
    'nzpcn.org.nz': ('New Zealand Plant Conservation Network', 'en', 'New Zealand account; local occurrence is not automatically native origin'),
    'nparks.gov.sg': ('National Parks Board, Singapore', 'en', 'Requested taxon account; distinguish native range from cultivation in Singapore'),
    'missouriplants.com': ('MissouriPlants', 'en', 'Missouri regional botanical account; local occurrence is not native origin'),
    'plants.ces.ncsu.edu': ('North Carolina State University Extension Plant Toolbox', 'en', 'Requested taxon account; retain regional, cultivation and toxicity qualifications'),
    'missouribotanicalgarden.org': ('Missouri Botanical Garden Plant Finder', 'en', 'Requested taxon account; distinguish garden preferences from native habitat'),
    'floracatalana.cat': ('Flora Catalana', 'ca', 'Catalonia regional botanical account; local occurrence is not global native origin'),
    'botany.cz': ('BOTANY.cz', 'cs', 'Requested taxon botanical account; retain regional qualifications'),
    'worldfloraonline.org': ('World Flora Online', 'en', 'Requested taxon flora account; retain source-flora regional qualifications'),
    'nzflora.info': ('Flora of New Zealand', 'en', 'New Zealand flora account; local occurrence is not global native origin'),
    'nzplants.auckland.ac.nz': ('New Zealand Plants, University of Auckland', 'en', 'New Zealand botanical account; retain regional qualifications'),
    'plantnet.rbgsyd.nsw.gov.au': ('PlantNET, Flora of New South Wales', 'en', 'New South Wales flora account; local occurrence is not global native origin'),
    'florabase.dbca.wa.gov.au': ('FloraBase, Western Australian Herbarium', 'en', 'Western Australian flora account; local native status refers to Western Australia'),
    'herbarivirtual.uib.es': ('Herbari Virtual, Universitat de les Illes Balears', 'ca', 'Regional flora account; retain geographic qualifications'),
    'warcapps.usgs.gov': ('USGS Wetland and Aquatic Research Center', 'en', 'Requested taxon account; distinguish native distribution from introduced occurrence'),
    'plants.ifas.ufl.edu': ('University of Florida IFAS, Center for Aquatic and Invasive Plants', 'en', 'Florida botanical account; distinguish native range from introduced occurrence'),
    'flora.org.il': ('Flora of Israel Online', 'en', 'Israel regional flora account; local occurrence is not global native origin'),
}
HEADINGS = re.compile(r'^(?:identification notes|description|biotope|distribution|habitat|ecologie|ecology|key characteristics|general description|biology|biologie|alimentation|reproduction|appearance|preferences|introduction|detailed description|structural class|uses?|noteworthy characteristics|culture|rozšíření|ekologie|popis|descripció|hàbitat|distribució|forma vital|descripci[óo]n|distribuci[óo]n|h[aá]bitat|morfolog[ií]a|ecolog[ií]a|descrição|distribuição|morphology|native range)\b', re.I)


def lines(raw):
    parts = re.split(r'L\d+(?:@P\d+)?:\s?', raw)[1:]
    result = []
    for part in parts:
        part = re.sub(r'cite[^†]+†([^†]+)(?:†[^]+)?', r'\1', part)
        part = re.sub(r'cite[^]*', '', part)
        result.append(part.strip())
    return result


def extract(entry, raw):
    host = urlparse(entry['url']).hostname.removeprefix('www.').removeprefix('www2.')
    if host not in PROVIDERS or entry['rank'] not in {'species','hybrid','genus','genushybrid'}:
        return None, 'Provider or rank needs individual review'
    # Verify the actual returned document title, not the search result title.
    title = raw.splitlines()[0].rsplit(' (http', 1)[0]
    name = norm(entry['name'])
    identity_title=title
    if not re.search(r'(?<!\w)'+re.escape(name)+r'(?!\w)', norm(identity_title)):
        own_headings=[line.lstrip('# ').strip() for line in lines(raw) if re.match(r'^#{1,3} ',line) and re.match(re.escape(name)+r'(?:\s|$)',norm(line.lstrip('# ')))]
        if not own_headings:return None, 'Scientific identity absent from returned account title'
        identity_title=own_headings[0]
        title=identity_title+' — '+PROVIDERS[host][0]
    suffix=norm(identity_title).split(name,1)[1].strip()
    if re.match(r'(?:subsp\.|ssp\.|var\.|forma|f\.)\s',suffix):
        return None, 'Account describes an infraspecific taxon, not the whole requested taxon'
    if entry['rank'] in {'genus','genushybrid'} and not any(norm(line.lstrip('# ').strip())==name for line in lines(raw) if line.startswith('#')):
        return None, 'Genus needs its own exact account heading; member accounts excluded'
    if 'application/pdf' in raw[:600]:
        return None, 'PDF account boundaries need individual review'
    selected = []; active = False; section = ''
    for line in lines(raw):
        heading = re.match(r'^#{1,6}\s+(.+)', line)
        label = re.match(r'^([^:\n]{3,60}):\s*(.*)', line)
        if not heading and not label and len(line.split())<=4 and HEADINGS.fullmatch(line):
            section=line;active=True;continue
        if heading:
            section = heading[1]; active = bool(HEADINGS.match(section))
            continue
        if label:
            section = label[1]; active = bool(HEADINGS.match(section))
            if active: line = label[2]
        if not active or not line or line in {'-','–','—','N/A','[Button]'}:
            continue
        if line.startswith(('* ', '[', 'Image:')) or re.search(r'cookie|subscribe|contact us|download|read the field guide|view distribution|bibliograph', line, re.I):
            continue
        selected.append(section+': '+line)
    if not selected:
        return None, 'No descriptive account sections extracted'
    if entry['rank']=='species' and re.search(r'\bis a\b[^.]{0,60}\bcultivar\b',' '.join(selected)[:400],re.I):
        return None, 'Source calls the subject a cultivar; species scope needs review'
    # Keep complete source passages, with enough context for comparisons.
    bounded = []
    for paragraph in selected:
        if len((' '.join(bounded+[paragraph])).split()) > 450:
            continue
        bounded.append(paragraph)
    if len(' '.join(bounded).split()) < 25:
        return None, 'Extract is too thin'
    provider, language, scope = PROVIDERS[host]
    return {'title': title, 'language': language, 'provider': provider,
            'scope': scope, 'selectedText': entry['name']+' — '+scope+'.\n\n'+'\n\n'.join(bounded)}, None


def main():
    counts = Counter(); review = []; docs = {}
    indexes=[*sorted((CORPUS/'discovery/nonvascular').glob('index-*.json')),*sorted((CORPUS/'discovery/vascular').glob('index-*.json'))]
    for index in indexes:
        for entry in read(index)['entries']:
            page = ROOT/entry['pageFile']
            if not page.exists() or not page.with_suffix('.json').exists(): continue
            raw = page.read_text(); extracted, reason = extract(entry, raw)
            if reason:
                review.append({'taxonId':entry['taxonId'], 'name':entry['name'], 'url':entry['url'], 'reason':reason}); counts[reason]+=1; continue
            metadata = read(page.with_suffix('.json'))
            original = {**extracted, 'url':entry['url'], 'scientificName':entry['name'], 'rank':entry['rank'],
                        'fetchedAt':metadata['fetchedAt'], 'webReadPath':str(page.relative_to(ROOT)), 'webReadSha256':sha(raw)}
            path = CORPUS/'botanical-web-originals'/f"{entry['taxonId']}-{sha(compact(original))[:16]}.json"
            if not path.exists(): write(path, original)
            doc = {'title':extracted['title'], 'language':extracted['language'], 'scope':extracted['scope'],
                   'clean':extracted['selectedText'], 'identityDecision':'Exact scientific name in returned specialist species-account title; descriptive sections only',
                   'path':str(path.relative_to(ROOT)), 'sha256':sha(compact(original)), 'url':entry['url'],
                   'credit':{'title':extracted['title'], 'url':entry['url'], 'attribution':extracted['provider']}}
            docs.setdefault(entry['taxonId'], {})[entry['url']] = doc
            counts['supported_account'] += 1
    for tid, sources in docs.items():
        write(CORPUS/'botanical-web'/f'{tid}.json', {'taxonId':tid, 'sources':list(sources.values()), 'preparedAt':now()})
    write(CORPUS/'botanical-web-review.json', {'counts':dict(counts), 'review':review, 'updatedAt':now()})
    print(compact({'counts':dict(counts), 'uniqueSupportedTaxa':len(docs)}))


if __name__ == '__main__': main()
