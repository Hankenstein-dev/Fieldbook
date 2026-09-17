import unittest

from review_plant_content_pilot import validate


class EvidencePointerTests(unittest.TestCase):
    def setUp(self):
        self.packet={'taxonId':1,'sources':[{'passages':[{'id':'s1:p1','text':'Fruit is used.'}]}]}
        self.output={'taxonId':1,'status':'draft','facts':[
            {'id':'f1','kind':'human_use','value':'Fruit is used.','scope':None,'qualifiers':[],'evidence':['s1:p1']}],
            'foodUse':{'status':'not_documented','details':[]},'toxicity':{'status':'not_documented','details':[]},
            'summary':'Fruit is used.','summaryEvidence':['f1'],'reviewFlags':[]}

    def test_rejects_nonexistent_passage(self):
        self.output['facts'][0]['evidence']=['s2:p99']
        self.assertIn('Missing or invalid passage pointer',validate(self.output,self.packet))

    def test_rejects_cross_taxon_result(self):
        self.output['taxonId']=2
        self.assertIn('Wrong taxon ID',validate(self.output,self.packet))

    def test_no_sources_must_not_produce_claims(self):
        self.packet['sources']=[]
        self.assertIn('Claims with no source',validate(self.output,self.packet))

    def test_existing_pointer_does_not_prove_entailment(self):
        # Deliberately false claim: this check is structural, not a botanical judge.
        self.output['facts'][0]['value']='Leaves are universally safe.'
        self.assertEqual(validate(self.output,self.packet),[])

    def test_claimed_food_use_requires_evidence_details(self):
        self.output['foodUse']['status']='documented_use'
        self.assertIn('foodUse: claim without details',validate(self.output,self.packet))


if __name__=='__main__':unittest.main()
