# this file is devoted for parsing the bvh format into a json file, which can be used for three.js or gl's
# you can find the BVH format spec. in http://research.cs.wisc.edu/graphics/Courses/cs-838-1999/Jeff/BVH.html


# NOTE: Morino will not be so strict with the spec, which means an extra(or missed) line will not be blamed..


# IF you use this data for implementing skeletal animation, you will find the initial rotation in the first keyframe data


import sys


MORINO = [True];

## a keyword dictionary
KEYWORDS = {
   'HIER' : 'HIERARCHY',
    'MOT': 'MOTION',
    'RT': 'ROOT',
    'OST': 'OFFSET',
    'JNT' : 'JOINT',
    'CHN' : 'CHANNELS',
    'END' : 'End Site',
    'EMPTY' : '',
    'LB' : '{',
    'RB' : '}',
    'ANOY': 'FIN'
};

STRIPPED_CHAR = '\t\r';



def my_assert(conditions):
    if(not conditions):
        sys.stderr.write("BAD BVH FORMAT\n");
        assert(False);
    return;



def tokenize(s):
    return s.strip(STRIPPED_CHAR).split(' ');



# default order of channel input is [X, Y, Z, ZROT, YROT, XROT]

def create_node(offsets, id, pid = -1, name = None, channels = 0):
    return {
        'offsets': offsets,
        'id' : id,
        'parent_id' : pid,
        'name' : name if name != None else (KEYWORDS['ANOY']+'_'+id),
        'chn_num' : channels
    };

"""
@param hier: lines of data in the hier part
"""
def parse_hierarchy(hier_lines):
    nodes = list();
    pid = -1;
    id = 0;
    s = 0 ;
    e = len(hier_lines) - 1;
    while(e >= 0):
        if(hier_lines[e].strip(STRIPPED_CHAR) != KEYWORDS['EMPTY']):
            break;
        e -= 1;
    _parse_hierarchy(hier_lines, s, e, nodes);
    return nodes;


"""
@func: recursively parse the bvh skeletal format
"""
def _parse_hierarchy(hier_lines, s, e, nodes):



"""
@parma: motions: lines of double array
"""
def parse_motions(motions):
    pass;


def split_components(bvh_lines):
    hier_head_i = -1;
    mot_head_i = -1;


    for iter, line in enumerate(bvh_lines):
        line = line.strip();
        if(line == KEYWORDS['HIER']):
            hier_head_i = iter;
        if(line == KEYWORDS['MOT']):
            mot_head_i = iter;
            break; # no need to go through the frame part

    # bad format
    my_assert(hier_head_i >= 0 and mot_head_i >= 0):

    return bvh_lines[hier_head_i+1:mot_head_i], bvh_lines[mot_head_i+1:];

# read the data into memory, a trivial io wrapper
def load(path):
    fid= open(path, 'rb');
    obj = fid.read();
    fid.close();
    return obj;






"""
@param path: the path to the BVH file
@param dump_path(*): path to dump (OPTIONAL)

@return a json-format anim data
"""

def bvh_convert(path, dump_path = None):
    bvh_dat = load(path);
    bvh_dat = bvh_dat.split('\n');
    hier, motions = split_components(bvh_dat);


    if(MORINO[0]):
        print('################ BEGIN OF HIER ########################');
        print(hier);
        print('################ END OF HIER ########################\n\n\n');

        print('################ BEGIN OF MOTION ########################');
        print(motions[0:2]);
        print('################ END OF MOTION ########################\n\n\n');




if __name__ == '__main__':
    sample_path = 'data/10/10_01.bvh';
    bvh_convert(sample_path);
