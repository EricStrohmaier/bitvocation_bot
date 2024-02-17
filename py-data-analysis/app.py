import os
import pandas as pd
import matplotlib.pyplot as plt
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def fetch_data():
    response = supabase.table('job_table').select("*").execute()
    data = response.data if response.data else None
    return data

def analyze_data(data):
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Ensure 'created_at' is datetime type
    df['created_at'] = pd.to_datetime(df['created_at'], errors='coerce')

    # Analysis 1: Top Tags (Skills/Technologies)
    all_tags = [tag for sublist in df['tags'].dropna() for tag in sublist]
    tag_counts = pd.Series(all_tags).value_counts().head(10)
    plot_top(tag_counts, "Top 10 Skills and Technologies")

    # Analysis 2: Top Categories
    top_categories = df['category'].value_counts().head(10)
    plot_top(top_categories, "Top 10 Job Categories")

    # Analysis 3: Top Locations
    top_locations = df['location'].value_counts().head(10)
    plot_top(top_locations, "Top 10 Job Locations")

    # Analysis 4: Top Job Titles
    top_titles = df['title'].value_counts().head(10)
    plot_top(top_titles, "Top 10 Job Titles")

    # Analysis 5: Job Postings Over Time
    postings_by_month = df.set_index('created_at').resample('ME').size()
    plt.figure(figsize=(10, 6))
    postings_by_month.plot()
    plt.title('Job Postings Over Time')
    plt.xlabel('Month')
    plt.ylabel('Number of Job Postings')
    plt.show()

def plot_top(series, title):
    plt.figure(figsize=(10, 6))
    series.plot(kind='bar')
    plt.title(title)
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    data = fetch_data()
    if data:
        analyze_data(data)
